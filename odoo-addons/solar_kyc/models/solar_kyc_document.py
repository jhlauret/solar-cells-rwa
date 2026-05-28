# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""solar.kyc.document — KYC document uploaded by the investor.

The actual file is stored in MinIO (object storage).
Odoo only stores the path reference and integrity hash.
File upload is handled by the Node.js backend, which calls
upload_document() after writing the file to MinIO.
"""

import logging
import uuid as uuid_lib

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)

DOCUMENT_TYPE_SELECTION = [
    ('identity_card',      'National ID card'),
    ('passport',           'Passport'),
    ('driving_licence',    'Driving licence'),
    ('selfie_liveness',    'Selfie + liveness check'),
    ('proof_of_address',   'Proof of address'),
    ('source_of_funds',    'Source of funds declaration'),
    ('bank_statement',     'Bank statement'),
    ('tax_residency',      'Tax residency certificate'),
    ('corporate_kbis',     'K-bis / Company register extract'),
    ('corporate_statutes', 'Company statutes'),
    ('corporate_ubo',      'UBO declaration'),
    ('other',              'Other'),
]

DOCUMENT_STATE_SELECTION = [
    ('pending',   'Pending review'),
    ('validated', 'Validated'),
    ('rejected',  'Rejected'),
    ('expired',   'Expired'),
]

# Maximum allowed file size in bytes (10 MB)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
}


class SolarKycDocument(models.Model):
    """A document uploaded as part of a KYC case."""

    _name        = 'solar.kyc.document'
    _description = 'KYC Document'
    _order       = 'uploaded_at desc'
    _rec_name    = 'document_type'

    # ------------------------------------------------------------------
    # Identity
    # ------------------------------------------------------------------

    uuid = fields.Char(
        string="UUID",
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
    )
    case_id = fields.Many2one(
        'solar.kyc.case',
        string="KYC case",
        required=True,
        ondelete='cascade',
        index=True,
    )

    # ------------------------------------------------------------------
    # Document metadata
    # ------------------------------------------------------------------

    document_type = fields.Selection(
        selection=DOCUMENT_TYPE_SELECTION,
        string="Document type",
        required=True,
        index=True,
    )
    minio_path = fields.Char(
        string="MinIO path",
        required=True,
        copy=False,
        help="Full path in MinIO object storage: bucket/prefix/filename. "
             "Example: kyc-documents/partner-uuid/passport-001.pdf",
    )
    sha256_hash = fields.Char(
        string="SHA-256 hash",
        size=64,
        required=True,
        copy=False,
        help="Hex-encoded SHA-256 of the file content for integrity verification.",
    )
    mime_type = fields.Char(
        string="MIME type",
        copy=False,
        help="e.g. 'application/pdf', 'image/jpeg'.",
    )
    file_size_bytes = fields.Integer(
        string="File size (bytes)",
        copy=False,
    )

    # ------------------------------------------------------------------
    # Review state
    # ------------------------------------------------------------------

    state = fields.Selection(
        selection=DOCUMENT_STATE_SELECTION,
        string="State",
        default='pending',
        required=True,
        index=True,
        tracking=True,
    )
    uploaded_at = fields.Datetime(
        string="Uploaded at",
        default=fields.Datetime.now,
        required=True,
        copy=False,
    )
    reviewed_at = fields.Datetime(string="Reviewed at", copy=False)
    reviewed_by = fields.Many2one('res.users', string="Reviewed by", copy=False)

    # ------------------------------------------------------------------
    # Provider review
    # ------------------------------------------------------------------

    provider_document_id = fields.Char(
        string="Provider document ID",
        copy=False,
        index=True,
        help="Identifier in the KYC provider's system (Onfido, Sumsub, etc.).",
    )
    validation_result = fields.Json(
        string="Provider validation result",
        copy=False,
        help="Raw JSON result returned by the provider for this document.",
    )
    rejection_reason = fields.Text(
        string="Rejection reason",
        copy=False,
    )

    # ------------------------------------------------------------------
    # Constraints
    # ------------------------------------------------------------------

    @api.constrains('file_size_bytes')
    def _check_file_size(self):
        for doc in self:
            if doc.file_size_bytes and doc.file_size_bytes > MAX_FILE_SIZE_BYTES:
                raise ValidationError(_(
                    "Document '%s' exceeds the maximum allowed size of 10 MB "
                    "(actual size: %.1f MB)."
                ) % (doc.document_type, doc.file_size_bytes / 1024 / 1024))

    @api.constrains('mime_type')
    def _check_mime_type(self):
        for doc in self:
            if doc.mime_type and doc.mime_type not in ALLOWED_MIME_TYPES:
                raise ValidationError(_(
                    "MIME type '%s' is not allowed. Accepted: %s."
                ) % (doc.mime_type, ', '.join(sorted(ALLOWED_MIME_TYPES))))

    @api.constrains('sha256_hash')
    def _check_sha256_format(self):
        import re
        sha_re = re.compile(r'^[0-9a-f]{64}$')
        for doc in self:
            if doc.sha256_hash and not sha_re.match(doc.sha256_hash):
                raise ValidationError(_(
                    "SHA-256 hash '%s...' is not valid. "
                    "Expected: 64 lowercase hexadecimal characters."
                ) % doc.sha256_hash[:16])

    # ------------------------------------------------------------------
    # CRUD — auto-start the KYC case on first document upload
    # ------------------------------------------------------------------

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for doc in records:
            # Transition the case to 'in_progress' if it's still 'not_started'
            if doc.case_id.state == 'not_started':
                doc.case_id.action_start()
            # Audit log
            self.env['solar.audit.log'].create_audit_entry(
                action_code='kyc.document.uploaded',
                subject=doc.case_id,
                after={
                    'document_type': doc.document_type,
                    'document_uuid': doc.uuid,
                    'mime_type':     doc.mime_type,
                    'size_bytes':    doc.file_size_bytes,
                },
            )
        return records

    # ------------------------------------------------------------------
    # Review actions
    # ------------------------------------------------------------------

    def action_validate_document(self):
        """pending → validated. Called by the KYC operator or provider webhook."""
        for doc in self:
            if doc.state != 'pending':
                raise UserError(_(
                    "Document '%s' is in state '%s'. "
                    "Only 'pending' documents can be validated."
                ) % (doc.document_type, doc.state))
            now = fields.Datetime.now()
            doc.write({
                'state':       'validated',
                'reviewed_at': now,
                'reviewed_by': self.env.uid,
            })
            self.env['solar.audit.log'].create_audit_entry(
                action_code='kyc.document.validated',
                subject=doc.case_id,
                after={'document_uuid': doc.uuid, 'document_type': doc.document_type},
            )

    def action_reject_document(self, reason=None):
        """pending → rejected."""
        for doc in self:
            doc.write({
                'state':             'rejected',
                'reviewed_at':       fields.Datetime.now(),
                'reviewed_by':       self.env.uid,
                'rejection_reason':  reason,
            })
            self.env['solar.audit.log'].create_audit_entry(
                action_code='kyc.document.rejected',
                subject=doc.case_id,
                after={
                    'document_uuid':  doc.uuid,
                    'rejection_reason': reason,
                },
            )

    # ------------------------------------------------------------------
    # JSON-RPC API
    # ------------------------------------------------------------------

    @api.model
    def register_document(self, case_uuid, document_type, minio_path,
                          sha256_hash, mime_type=None, file_size_bytes=None,
                          provider_document_id=None):
        """Register a document that was already uploaded to MinIO.

        Called by the Node.js backend after it has written the file to MinIO.

        :param str case_uuid: UUID of the solar.kyc.case.
        :param str document_type: Selection value (e.g. 'passport').
        :param str minio_path: Full MinIO path (bucket/prefix/filename).
        :param str sha256_hash: 64-char hex SHA-256 of the file.
        :param str mime_type: MIME type of the file.
        :param int file_size_bytes: File size in bytes.
        :param str provider_document_id: Provider reference (optional).
        :returns: dict with document uuid.
        """
        case = self.env['solar.kyc.case'].search(
            [('uuid', '=', case_uuid)], limit=1,
        )
        if not case:
            raise UserError(_("KYC case not found for UUID '%s'.") % case_uuid)

        doc = self.create({
            'case_id':              case.id,
            'document_type':        document_type,
            'minio_path':           minio_path,
            'sha256_hash':          sha256_hash,
            'mime_type':            mime_type,
            'file_size_bytes':      file_size_bytes,
            'provider_document_id': provider_document_id,
        })
        return {'document_uuid': doc.uuid}

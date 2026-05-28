# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""solar.asset.document — Technical documents attached to a solar asset.

Stored on MinIO. Odoo keeps the path reference and metadata only.
Public documents are visible to investors; private ones to operators only.
"""

import logging
import uuid as uuid_lib

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)

DOCUMENT_TYPE_SELECTION = [
    ('prospectus',         'Prospectus / Information memorandum'),
    ('technical_report',   'Technical report'),
    ('ppa_contract',       'PPA contract'),
    ('insurance',          'Insurance certificate'),
    ('land_lease',         'Land lease agreement'),
    ('grid_connection',    'Grid connection permit'),
    ('environmental',      'Environmental study'),
    ('audit_report',       'Third-party audit report'),
    ('annual_report',      'Annual production report'),
    ('other',              'Other'),
]

ALLOWED_MIME_TYPES = {'application/pdf', 'image/jpeg', 'image/png'}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB for asset documents


class SolarAssetDocument(models.Model):
    """Technical document associated with a solar asset."""

    _name        = 'solar.asset.document'
    _description = 'Solar Asset Document'
    _order       = 'uploaded_at desc'
    _rec_name    = 'document_type'

    uuid = fields.Char(
        string="UUID",
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
    )
    asset_id = fields.Many2one(
        'solar.asset',
        string="Asset",
        required=True,
        ondelete='cascade',
        index=True,
    )
    document_type = fields.Selection(
        selection=DOCUMENT_TYPE_SELECTION,
        string="Document type",
        required=True,
    )
    label = fields.Char(
        string="Label",
        help="Display name for this document (e.g. 'PVSyst simulation 2024').",
    )
    minio_path = fields.Char(
        string="MinIO path",
        required=True,
        copy=False,
        help="Full MinIO path: bucket/prefix/filename.",
    )
    sha256_hash = fields.Char(
        string="SHA-256 hash",
        size=64,
        copy=False,
        help="Integrity hash for verification.",
    )
    mime_type = fields.Char(string="MIME type")
    file_size_bytes = fields.Integer(string="File size (bytes)")
    uploaded_at = fields.Datetime(
        string="Uploaded at",
        default=fields.Datetime.now,
        required=True,
        copy=False,
    )
    is_public = fields.Boolean(
        string="Visible to investors",
        default=True,
        help="If True, this document is accessible via the public API "
             "to any investor viewing the asset.",
    )

    @api.constrains('file_size_bytes')
    def _check_file_size(self):
        for doc in self:
            if doc.file_size_bytes and doc.file_size_bytes > MAX_FILE_SIZE_BYTES:
                raise ValidationError(_(
                    "Document '%s' exceeds the 50 MB limit (%.1f MB)."
                ) % (doc.document_type, doc.file_size_bytes / 1024 / 1024))

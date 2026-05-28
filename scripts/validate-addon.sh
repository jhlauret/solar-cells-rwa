#!/usr/bin/env bash
#
# validate-addon.sh — Validation statique d'un addon Odoo.
#
# Usage:  ./scripts/validate-addon.sh <addon_name>
# Example: ./scripts/validate-addon.sh solar_audit
#
# Vérifie :
#   - Syntaxe Python (ast.parse) de tous les .py
#   - Bien-formé XML de tous les .xml
#   - Présence du __manifest__.py
#   - Cohérence des fichiers déclarés dans 'data' du manifest
#   - Présence d'au moins un test
#
# Ne nécessite ni Docker ni Odoo. Échec → exit code != 0.

set -euo pipefail

ADDON="${1:-}"
if [ -z "$ADDON" ]; then
    echo "Usage: $0 <addon_name>"
    echo "Example: $0 solar_audit"
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADDON_DIR="$REPO_ROOT/odoo-addons/$ADDON"

if [ ! -d "$ADDON_DIR" ]; then
    echo "❌ Addon directory not found: $ADDON_DIR"
    exit 1
fi

cd "$ADDON_DIR"

echo "=============================================================="
echo "  Validation statique de l'addon : $ADDON"
echo "  Dossier : $ADDON_DIR"
echo "=============================================================="
echo ""

ERRORS=0

# 1. Manifest présent ?
if [ ! -f "__manifest__.py" ]; then
    echo "❌ __manifest__.py manquant"
    ERRORS=$((ERRORS + 1))
else
    echo "✓ __manifest__.py présent"
fi

# 2. Python valide ?
echo ""
echo "→ Vérification syntaxe Python..."
for f in $(find . -name "*.py" -type f); do
    if python3 -c "import ast; ast.parse(open('$f').read())" 2>/dev/null; then
        echo "  ✓ $f"
    else
        echo "  ❌ $f — erreur de syntaxe :"
        python3 -c "import ast; ast.parse(open('$f').read())" 2>&1 | sed 's/^/      /'
        ERRORS=$((ERRORS + 1))
    fi
done

# 3. XML bien formé ?
echo ""
echo "→ Vérification XML..."
for f in $(find . -name "*.xml" -type f); do
    if python3 -c "import xml.etree.ElementTree as ET; ET.parse('$f')" 2>/dev/null; then
        echo "  ✓ $f"
    else
        echo "  ❌ $f — XML invalide :"
        python3 -c "import xml.etree.ElementTree as ET; ET.parse('$f')" 2>&1 | sed 's/^/      /'
        ERRORS=$((ERRORS + 1))
    fi
done

# 4. CSV bien formé ?
echo ""
echo "→ Vérification CSV..."
for f in $(find . -name "*.csv" -type f); do
    if python3 -c "import csv; list(csv.DictReader(open('$f')))" 2>/dev/null; then
        rows=$(python3 -c "import csv; print(len(list(csv.DictReader(open('$f')))))")
        echo "  ✓ $f ($rows lignes)"
    else
        echo "  ❌ $f — CSV invalide"
        ERRORS=$((ERRORS + 1))
    fi
done

# 5. Fichiers déclarés dans le manifest existent-ils ?
echo ""
echo "→ Cohérence des fichiers du manifest..."
python3 << PYEOF
import ast
with open('__manifest__.py') as f:
    src = f.read()
tree = ast.parse(src)
for node in ast.walk(tree):
    if isinstance(node, ast.Dict):
        for k, v in zip(node.keys, node.values):
            if isinstance(k, ast.Constant) and k.value == 'data':
                if isinstance(v, ast.List):
                    files = [el.value for el in v.elts if isinstance(el, ast.Constant)]
                    import os
                    missing = [f for f in files if not os.path.exists(f)]
                    if missing:
                        for f in missing:
                            print(f"  ❌ Déclaré dans 'data' mais manquant : {f}")
                        exit(1)
                    for f in files:
                        print(f"  ✓ {f}")
PYEOF
if [ $? -ne 0 ]; then
    ERRORS=$((ERRORS + 1))
fi

# 6. Au moins un test ?
echo ""
echo "→ Présence de tests..."
if [ -d "tests" ] && [ -n "$(find tests -name 'test_*.py')" ]; then
    test_count=$(grep -h "def test_" tests/test_*.py | wc -l)
    echo "  ✓ $test_count méthodes de test trouvées"
else
    echo "  ⚠ Aucun test trouvé (RULE-OO-05 recommande au moins un test de smoke)"
fi

# Bilan
echo ""
echo "=============================================================="
if [ "$ERRORS" -eq 0 ]; then
    echo "  ✅ Validation OK"
    exit 0
else
    echo "  ❌ $ERRORS erreur(s) — voir détail ci-dessus"
    exit 1
fi

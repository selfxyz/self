#!/bin/bash
# Script simple para verificar la estructura de los issue templates

echo "🔍 Verificando issue templates..."
echo ""

TEMPLATES_DIR=".github/ISSUE_TEMPLATE"
ERRORS=0

for template in "$TEMPLATES_DIR"/*.md; do
    if [ -f "$template" ]; then
        filename=$(basename "$template")
        echo "📄 Verificando: $filename"

        # Verificar que tiene frontmatter
        if ! grep -q "^---$" "$template"; then
            echo "  ❌ Error: No tiene frontmatter YAML (---)"
            ERRORS=$((ERRORS + 1))
        else
            echo "  ✅ Tiene frontmatter YAML"
        fi

        # Verificar que tiene 'name:' en el frontmatter
        if ! grep -q "^name:" "$template"; then
            echo "  ❌ Error: No tiene campo 'name:'"
            ERRORS=$((ERRORS + 1))
        else
            echo "  ✅ Tiene campo 'name:'"
        fi

        # Verificar que tiene 'about:' en el frontmatter
        if ! grep -q "^about:" "$template"; then
            echo "  ❌ Error: No tiene campo 'about:'"
            ERRORS=$((ERRORS + 1))
        else
            echo "  ✅ Tiene campo 'about:'"
        fi

        echo ""
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "✅ Todos los templates tienen la estructura básica correcta"
    echo ""
    echo "💡 Para probar completamente:"
    echo "   1. Haz push de estos cambios a GitHub"
    echo "   2. Ve a tu repositorio → Issues → New Issue"
    echo "   3. Deberías ver los templates como opciones"
    exit 0
else
    echo "❌ Se encontraron $ERRORS error(es)"
    exit 1
fi

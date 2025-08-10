#!/bin/bash

echo "🔍 Finding ALL files missing new lines after license headers (including split headers)..."

# Find all files with license headers
files=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.cjs" -o -name "*.rb" -o -name "*.sh" | grep -v node_modules | grep -v ios/Pods | grep -v .git | xargs grep -l "SPDX-License-Identifier: BUSL-1.1" 2>/dev/null || true)

count=0

for file in $files; do
    if [ -f "$file" ]; then
        # Check if file has license header on first line (complete or partial)
        if grep -q "^// SPDX-License-Identifier: BUSL-1.1" "$file" || grep -q "^# SPDX-License-Identifier: BUSL-1.1" "$file"; then
            # Get second line
            second_line=$(sed -n '2p' "$file" 2>/dev/null || echo "")
            third_line=$(sed -n '3p' "$file" 2>/dev/null || echo "")

            # Check if second line is part of license header (contains "Apache-2.0")
            if [[ "$second_line" == *"Apache-2.0"* ]]; then
                # License header is split across lines 1 and 2, check line 3
                if [ -n "$third_line" ] && ! [[ "$third_line" =~ ^[[:space:]]*$ ]] && ! [[ "$third_line" =~ ^[[:space:]]*// ]] && ! [[ "$third_line" =~ ^[[:space:]]*# ]] && ! [[ "$third_line" =~ ^[[:space:]]*/\* ]]; then
                    echo "❌ $file - Missing new line after split license header"
                    echo "   Line 1: $(sed -n '1p' "$file")"
                    echo "   Line 2: $second_line"
                    echo "   Line 3: $third_line"
                    echo ""
                    count=$((count + 1))
                fi
            else
                # License header is on one line, check line 2
                if [ -n "$second_line" ] && ! [[ "$second_line" =~ ^[[:space:]]*$ ]] && ! [[ "$second_line" =~ ^[[:space:]]*// ]] && ! [[ "$second_line" =~ ^[[:space:]]*# ]] && ! [[ "$second_line" =~ ^[[:space:]]*/\* ]]; then
                    echo "❌ $file - Missing new line after single-line license header"
                    echo "   Line 1: $(sed -n '1p' "$file")"
                    echo "   Line 2: $second_line"
                    echo ""
                    count=$((count + 1))
                fi
            fi
        fi
    fi
done

echo "📊 Found $count files missing new lines after license headers"

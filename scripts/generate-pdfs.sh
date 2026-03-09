#!/bin/bash
# Usage: ./generate-pdfs.sh [chapter]
# e.g.   ./generate-pdfs.sh 02
#        ./generate-pdfs.sh all

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NOTES_DIR="$SCRIPT_DIR/../apps/example/public/notes"
OUT_DIR="$SCRIPT_DIR/../apps/example/public/pdfs"
CSS_DIR="$SCRIPT_DIR/pdf-styles"

mkdir -p "$OUT_DIR"

PANDOC_FLAGS="--pdf-engine=wkhtmltopdf \
  -V margin-top=18mm \
  -V margin-bottom=18mm \
  -V margin-left=15mm \
  -V margin-right=15mm"

generate_chapter() {
  local chapter="$1"
  local infile="$NOTES_DIR/cpp-chapter-${chapter}.md"

  if [ ! -f "$infile" ]; then
    echo "  skip: $infile not found"
    return
  fi

  local title="C++ Chapter ${chapter} Notes"

  for font in serif sans mono; do
    local outfile="$OUT_DIR/cpp-chapter-${chapter}-${font}.pdf"
    echo "  generating $outfile..."
    pandoc "$infile" \
      -o "$outfile" \
      $PANDOC_FLAGS \
      --css="$CSS_DIR/${font}.css" \
      --metadata title="$title" 2>&1 | grep -v "^Loading\|^\[" || true
    echo "  done ($(du -sh "$outfile" | cut -f1))"
  done
}

if [ "$1" = "all" ] || [ -z "$1" ]; then
  for f in "$NOTES_DIR"/cpp-chapter-*.md; do
    chapter=$(basename "$f" .md | sed 's/cpp-chapter-//')
    echo "Chapter $chapter:"
    generate_chapter "$chapter"
  done
else
  echo "Chapter $1:"
  generate_chapter "$1"
fi

echo "Done."

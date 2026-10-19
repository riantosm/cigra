#!/bin/sh
# Build phase "[Brand] App Icon" — padanan iOS dari copy `android/app/brand-icons/<brand>/` di
# android/app/build.gradle. Membaca BRAND dari ../.env (default sakaraguna) lalu menyalin
# ios/brand-icons/<brand>/AppIcon.appiconset ke Images.xcassets sebelum asset catalog di-compile.
# Brand tanpa folder di ios/brand-icons/ → AppIcon dibiarkan apa adanya (build tetap jalan).
set -e

ENV_FILE="${SRCROOT}/../.env"
BRAND=""
if [ -f "$ENV_FILE" ]; then
  BRAND=$(grep -E '^[[:space:]]*BRAND=' "$ENV_FILE" | tail -n 1 | sed -e 's/^[[:space:]]*BRAND=//' | tr -d "\"' \t\r")
fi
BRAND=${BRAND:-sakaraguna}

SRC="${SRCROOT}/brand-icons/${BRAND}/AppIcon.appiconset"
DEST="${SRCROOT}/${TARGET_NAME}/Images.xcassets/AppIcon.appiconset"

if [ -d "$SRC" ]; then
  rsync -a --delete "$SRC/" "$DEST/"
  echo "Brand app icon: ${BRAND}"
else
  echo "warning: ios/brand-icons/${BRAND}/AppIcon.appiconset tidak ada, AppIcon dibiarkan apa adanya."
fi

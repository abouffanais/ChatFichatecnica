"""
convertir_pdfs_a_texto.py
=========================
Extrae el texto de todos los PDFs en C:\PDF\ y los guarda como .txt
en netlify/functions/texts/

Los archivos .txt pesan ~100x menos que los PDFs originales.

REQUISITOS:
  pip install pdfminer.six

USO:
  python convertir_pdfs_a_texto.py
"""

import os
import sys

# Forzar salida UTF-8
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# --- CONFIGURACION -----------------------------------------------------------
PDF_DIR  = r"C:\PDF"
TEXT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "netlify", "functions", "texts")
# -----------------------------------------------------------------------------


def extraer_texto_pdf(pdf_path):
    """Extrae texto de un PDF usando pdfminer.six"""
    try:
        from pdfminer.high_level import extract_text
        texto = extract_text(pdf_path)
        # Limpiar espacios extra y lineas vacias multiples
        lineas = [l.strip() for l in texto.splitlines()]
        lineas = [l for l in lineas if l]  # Eliminar lineas vacias
        return "\n".join(lineas)
    except Exception as e:
        print(f"    [ERROR] {e}")
        return None


def main():
    print("=" * 55)
    print("  Kitchen Center - Conversion PDF a Texto")
    print("=" * 55)

    if not os.path.exists(PDF_DIR):
        print(f"\n  ERROR: No se encontro la carpeta {PDF_DIR}")
        return

    # Crear carpeta de salida
    os.makedirs(TEXT_DIR, exist_ok=True)

    pdfs = [f for f in os.listdir(PDF_DIR) if f.lower().endswith(".pdf")]
    total = len(pdfs)
    print(f"\n  PDFs encontrados: {total}")
    print(f"  Destino: {TEXT_DIR}\n")

    convertidos = 0
    errores     = 0
    omitidos    = 0

    for i, filename in enumerate(sorted(pdfs), 1):
        pdf_path  = os.path.join(PDF_DIR, filename)
        txt_name  = os.path.splitext(filename)[0] + ".txt"
        txt_path  = os.path.join(TEXT_DIR, txt_name)

        # Saltar si ya existe y es reciente
        if os.path.exists(txt_path) and os.path.getsize(txt_path) > 0:
            omitidos += 1
            continue

        print(f"  [{i}/{total}] {filename[:60]}")
        texto = extraer_texto_pdf(pdf_path)

        if texto and len(texto.strip()) > 10:
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(texto)
            size_kb = os.path.getsize(txt_path) / 1024
            print(f"    [OK] {size_kb:.1f} KB")
            convertidos += 1
        else:
            print(f"    [AVISO] Sin texto extraible - guardando vacio")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(f"[Sin texto extraible del PDF: {filename}]")
            errores += 1

    # Calcular tamanos
    total_kb = sum(
        os.path.getsize(os.path.join(TEXT_DIR, f)) / 1024
        for f in os.listdir(TEXT_DIR) if f.endswith(".txt")
    )

    print("\n" + "=" * 55)
    print(f"  Convertidos : {convertidos}")
    print(f"  Omitidos    : {omitidos} (ya existian)")
    print(f"  Sin texto   : {errores}")
    print(f"  Tamano total: {total_kb:.0f} KB ({total_kb/1024:.1f} MB)")
    print("=" * 55)
    print("\n  Siguiente paso:")
    print("  git add netlify/functions/texts/")
    print("  git commit -m 'Agregar textos fichas tecnicas'")
    print("  git push origin master:main")


if __name__ == "__main__":
    main()

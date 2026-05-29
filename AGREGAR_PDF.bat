@echo off
title Kitchen Center - Agregar PDFs nuevos
set REPO=C:\Users\abouffanais\Documents\Claude\Projects\ChatbotCyber
set PDFS_ORIGEN=C:\PDF

echo ===============================================
echo   Kitchen Center - Agregar PDFs al Chatbot
echo   %date% %time%
echo ===============================================
echo.

:: Verificar que haya PDFs en C:\PDF
if not exist "%PDFS_ORIGEN%\*.pdf" (
    echo ERROR: No se encontraron PDFs en %PDFS_ORIGEN%
    echo Copia los PDFs a C:\PDF primero.
    pause
    exit /b 1
)

:: Paso 1: Convertir PDFs nuevos a texto
echo [1/3] Convirtiendo PDFs a texto...
python "%REPO%\convertir_pdfs_a_texto.py"
if errorlevel 1 (
    echo ERROR al convertir PDFs
    pause
    exit /b 1
)

:: Paso 2: Git add + commit (solo los .txt, no los PDFs)
echo.
echo [2/3] Registrando cambios en Git...
git -C "%REPO%" add netlify/functions/texts/
git -C "%REPO%" add api/chat.js
git -C "%REPO%" add api/list-products.js
git -C "%REPO%" commit -m "Fichas tecnicas actualizadas %date% %time%"
if errorlevel 1 (
    echo No hay fichas nuevas para subir - todo ya estaba actualizado.
    pause
    exit /b 0
)

:: Paso 3: Push a GitHub
echo.
echo [3/3] Subiendo a GitHub...
git -C "%REPO%" push origin master:main
if errorlevel 1 (
    echo ERROR al subir a GitHub - verifica tu conexion
    pause
    exit /b 1
)

echo.
echo ===============================================
echo   Fichas tecnicas actualizadas exitosamente!
echo   Vercel redeplegara en ~40 segundos
echo ===============================================
echo.
echo Recuerda: los PDFs deben llamarse con el formato
echo   SKU NombreProducto.pdf
echo   Ejemplo: 16540 Refrigerador Smeg SBS IT.pdf
echo.
pause

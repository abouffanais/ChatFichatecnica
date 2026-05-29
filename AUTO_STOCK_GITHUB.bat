@echo off
title Kitchen Center - Auto Stock GitHub
set REPO=C:\Users\abouffanais\Documents\Claude\Projects\ChatbotCyber
set LOG=%REPO%\stock_update.log

:: Registrar inicio en log
echo. >> "%LOG%"
echo =============================================== >> "%LOG%"
echo   Inicio: %date% %time% >> "%LOG%"
echo =============================================== >> "%LOG%"

echo ===============================================
echo   Kitchen Center - Stock Auto Upload
echo   %date% %time%
echo ===============================================
echo.

:: Paso 1: Generar el stock.json
echo [1/3] Generando stock.json desde Excel + SAP...
echo [1/3] Generando stock.json... >> "%LOG%"
python "%REPO%\actualizar_stock.py" >> "%LOG%" 2>&1
if errorlevel 1 (
    echo ERROR al generar stock.json >> "%LOG%"
    echo ERROR al generar stock.json
    pause
    exit /b 1
)
echo Python OK >> "%LOG%"

:: Paso 2: Git add + commit
echo.
echo [2/3] Preparando commit en GitHub...
echo [2/3] Git add... >> "%LOG%"
git -C "%REPO%" add netlify/functions/stock.json >> "%LOG%" 2>&1
echo [2/3] Git commit... >> "%LOG%"
git -C "%REPO%" commit -m "Stock actualizado %date% %time%" >> "%LOG%" 2>&1
echo Resultado commit: %errorlevel% >> "%LOG%"

:: Paso 3: Push a GitHub
echo.
echo [3/3] Subiendo a GitHub...
echo [3/3] Git push... >> "%LOG%"
git -C "%REPO%" push origin master:main --force >> "%LOG%" 2>&1
if errorlevel 1 (
    echo ERROR PUSH - codigo: %errorlevel% >> "%LOG%"
    echo.
    echo ERROR al subir a GitHub
    echo Revisa el archivo stock_update.log para ver el detalle
    pause
    exit /b 1
)

echo Push OK >> "%LOG%"
echo.
echo ===============================================
echo   Stock actualizado y subido exitosamente!
echo   Vercel redeplegara en ~40 segundos
echo ===============================================
echo Exito completo: %date% %time% >> "%LOG%"

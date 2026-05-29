@echo off
title Kitchen Center - Actualizar Stock
echo ===============================================
echo   Kitchen Center - Actualizacion de Stock
echo ===============================================
echo.

:: Verificar que Python este instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado o no esta en el PATH
    pause
    exit
)

:: Instalar dependencias si no estan
echo Verificando dependencias...
pip install openpyxl pywin32 --quiet

:: Ejecutar el script
echo.
python "%~dp0actualizar_stock.py"

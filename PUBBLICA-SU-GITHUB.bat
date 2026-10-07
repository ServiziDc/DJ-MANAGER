@echo off
chcp 65001 > nul
title Pubblica Roster DJ su GitHub
echo.
echo ============================================
echo   Roster DJ - pubblicazione su GitHub
echo ============================================
echo.

cd /d "%~dp0"

if not exist ".git" (
    echo Questa cartella non e' ancora un repository Git.
    echo.
    set /p REPO="Incolla l'indirizzo del repository GitHub: "
    git init
    git branch -M main
    git remote add origin "%REPO%"
)

git add -A
git commit -m "Aggiornamento pagina Roster DJ"
git push -u origin main --force

echo.
echo ============================================
echo   Fatto.
echo   Attiva GitHub Pages in:
echo   Settings ^> Pages ^> Branch: main / (root)
echo ============================================
echo.
pause

@echo off

if "%~1" == "" (
    echo Missing 1st parameter 'modPathSkyrimSE'
    goto end
) else (
    mklink /d /j "WBA - Vanilla Config" "%~1\WBA - Vanilla Config"
    mklink /d /j "WBA - SKSE Plugin (Release - Special Edition)" "%~1\WBA - SKSE Plugin"
    mklink /d /j "WBA - SKSE Plugin (Debug - Special Edition)" "%~1\WBA - SKSE Plugin (Debug)"
    mklink /d /j "WBA - CC Arcane Archer Pack Patch" "%~1\WBA - CC Arcane Archer Pack Patch"
)

if "%~2" == "" (
    echo Missing 1st parameter 'modPathSkyrimAE'
    goto end
) else (
    mklink /d /j "WBA - SKSE Plugin (Release - Anniversary Edition)" "%~2\WBA - SKSE Plugin"
    mklink /d /j "WBA - SKSE Plugin (Debug - Anniversary Edition)" "%~2\WBA - SKSE Plugin (Debug)"
)

:end
echo Done!

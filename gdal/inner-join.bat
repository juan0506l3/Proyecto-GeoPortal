@echo off
cd /d "%~dp0"

if exist eventos-con-municipio.geojson del eventos-con-municipio.geojson
if exist ..\frontend\public\data\municipios-con-conteo.geojson del ..\frontend\public\data\municipios-con-conteo.geojson

ogr2ogr -f GeoJSON eventos-con-municipio.geojson eventos.geojson -dialect SQLITE -sql "SELECT e.nombre, e.categoria, e.tipo, e.direccion, e.municipio, m.codigo_dane, m.departamento, e.geometry FROM eventos e JOIN 'municipios.geojson'.municipios m ON e.municipio = m.municipio"

ogr2ogr -f GeoJSON ..\frontend\public\data\municipios-con-conteo.geojson municipios.geojson -dialect SQLITE -sql "SELECT m.nombre, m.codigo_dane, COUNT(e.nombre) AS total_eventos, m.geometry FROM municipios m JOIN 'eventos.geojson'.eventos e ON e.municipio = m.municipio GROUP BY m.codigo_dane"

echo Listo: inner join ejecutado con GDAL
pause

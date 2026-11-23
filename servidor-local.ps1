# Servidor local simples para testar o jogo no navegador (sem instalar nada).
# Uso: powershell -ExecutionPolicy Bypass -File servidor-local.ps1   →  abre http://localhost:8080
param([int]$Porta = 8080)

$raiz = $PSScriptRoot
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'
  '.mp3' = 'audio/mpeg'; '.ogg' = 'audio/ogg'; '.ico' = 'image/x-icon'; '.woff2' = 'font/woff2'
}

$ouvinte = New-Object System.Net.HttpListener
$ouvinte.Prefixes.Add("http://localhost:$Porta/")
$ouvinte.Start()
Write-Host "Última Ceia rodando em http://localhost:$Porta  (Ctrl+C para parar)"

while ($ouvinte.IsListening) {
  $c = $ouvinte.GetContext()
  $caminho = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath).TrimStart('/')
  if ($caminho -eq '') { $caminho = 'index.html' }
  $arquivo = [IO.Path]::GetFullPath((Join-Path $raiz $caminho))
  if (Test-Path $arquivo -PathType Container) { $arquivo = Join-Path $arquivo 'index.html' }
  if ($arquivo.StartsWith($raiz) -and (Test-Path $arquivo -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($arquivo)
    $ext = [IO.Path]::GetExtension($arquivo).ToLower()
    $c.Response.ContentType = $(if ($tipos[$ext]) { $tipos[$ext] } else { 'application/octet-stream' })
    $c.Response.Headers.Add('Cache-Control', 'no-store')
    $c.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $c.Response.StatusCode = 404
  }
  $c.Response.Close()
}

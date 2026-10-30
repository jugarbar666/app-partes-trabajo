Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Fondo blanco sólido para que la máscara (círculo / squircle) de Android recorte perfecto
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    $logoPath = Resolve-Path "public\company-logo.png"
    if (Test-Path $logoPath) {
        $logo = [System.Drawing.Image]::FromFile($logoPath)
        $targetWidth = [float]($size * 0.70)
        $targetHeight = [float]($targetWidth * $logo.Height / $logo.Width)
        $destX = [float](($size - $targetWidth) / 2.0)
        $destY = [float](($size - $targetHeight) / 2.0)

        $destRect = New-Object System.Drawing.RectangleF($destX, $destY, $targetWidth, $targetHeight)
        $g.DrawImage($logo, $destRect)
        $logo.Dispose()
    }

    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $outPath successfully"
}

Generate-Icon 192 'public\icon-192.png'
Generate-Icon 512 'public\icon-512.png'
Generate-Icon 180 'public\apple-touch-icon.png'

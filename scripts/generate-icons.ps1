Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $scale = [float]$size / 192.0

    # Background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    # Board background & border
    $boardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 41, 59))
    $boardPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 59, 130, 246), [float](6 * $scale))
    $boardRect = New-Object System.Drawing.RectangleF([float](44 * $scale), [float](34 * $scale), [float](104 * $scale), [float](128 * $scale))
    $g.FillRectangle($boardBrush, $boardRect)
    $g.DrawRectangle($boardPen, $boardRect.X, $boardRect.Y, $boardRect.Width, $boardRect.Height)

    # Clip at top
    $clipBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 59, 130, 246))
    $clipRect = New-Object System.Drawing.RectangleF([float](68 * $scale), [float](24 * $scale), [float](56 * $scale), [float](20 * $scale))
    $g.FillRectangle($clipBrush, $clipRect)

    # Lines on board
    $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 147, 197, 253), [float](8 * $scale))
    $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($linePen, [float](66 * $scale), [float](78 * $scale), [float](126 * $scale), [float](78 * $scale))
    $g.DrawLine($linePen, [float](66 * $scale), [float](104 * $scale), [float](126 * $scale), [float](104 * $scale))
    $g.DrawLine($linePen, [float](66 * $scale), [float](130 * $scale), [float](104 * $scale), [float](130 * $scale))

    # Green check circle
    $checkCircleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 22, 163, 74))
    $circleRadius = [float](24 * $scale)
    $cx = [float](132 * $scale)
    $cy = [float](134 * $scale)
    $g.FillEllipse($checkCircleBrush, ($cx - $circleRadius), ($cy - $circleRadius), ($circleRadius * 2), ($circleRadius * 2))

    # White checkmark
    $checkPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [float](6 * $scale))
    $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $p1 = New-Object System.Drawing.PointF([float](122 * $scale), [float](134 * $scale))
    $p2 = New-Object System.Drawing.PointF([float](129 * $scale), [float](141 * $scale))
    $p3 = New-Object System.Drawing.PointF([float](144 * $scale), [float](126 * $scale))
    $g.DrawLines($checkPen, @($p1, $p2, $p3))

    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $outPath successfully"
}

Generate-Icon 192 'public\icon-192.png'
Generate-Icon 512 'public\icon-512.png'

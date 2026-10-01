Add-Type -AssemblyName System.Drawing

function New-RabbitIcon([int]$size, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 255, 217, 232))
  $u = $size / 512.0

  function Ellipse($brush, $x, $y, $w, $h) {
    $g.FillEllipse($brush, $x, $y, $w, $h)
  }

  $outline = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 210, 110, 160), (6 * $u))
  $outline.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  # ears
  $ear = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 201, 222))
  $earIn = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 158, 196))
  foreach ($dx in @(118, 330)) {
    $earPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $earPath.AddBezier(($dx * $u), (170 * $u), ($dx - 70 * $u), (40 * $u), ($dx - 40 * $u), (30 * $u), ($dx + 18 * $u), (60 * $u))
    $earPath.AddBezier(($dx + 18 * $u), (60 * $u), ($dx + 75 * $u), (35 * $u), ($dx + 85 * $u), (60 * $u), ($dx + 52 * $u), (170 * $u))
    $earPath.CloseFigure()
    $g.FillPath($ear, $earPath)
    $g.DrawPath($outline, $earPath)
    $inPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $inPath.AddBezier((($dx + 8) * $u), (150 * $u), (($dx - 35) * $u), (70 * $u), (($dx - 15) * $u), (55 * $u), (($dx + 22) * $u), (70 * $u))
    $inPath.AddBezier((($dx + 22) * $u), (70 * $u), (($dx + 50) * $u), (55 * $u), (($dx + 55) * $u), (80 * $u), (($dx + 28) * $u), (150 * $u))
    $inPath.CloseFigure()
    $g.FillPath($earIn, $inPath)
  }

  # head + body
  $pink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 185, 212))
  Ellipse $pink (86 * $u) (118 * $u) (340 * $u) (330 * $u)
  $g.DrawEllipse($outline, (86 * $u), (118 * $u), (340 * $u), (330 * $u))
  $head = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 197, 224))
  Ellipse $head (146 * $u) (74 * $u) (220 * $u) (200 * $u)
  $g.DrawEllipse($outline, (146 * $u), (74 * $u), (220 * $u), (200 * $u))

  # belly
  $belly = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 248, 252))
  Ellipse $belly (168 * $u) (270 * $u) (176 * $u) (140 * $u)

  # eyes
  $eyeW = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  Ellipse $eyeW (185 * $u) (140 * $u) (66 * $u) (76 * $u)
  Ellipse $eyeW (261 * $u) (140 * $u) (66 * $u) (76 * $u)
  $pupil = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 74, 43, 58))
  Ellipse $pupil (205 * $u) (162 * $u) (30 * $u) (40 * $u)
  Ellipse $pupil (277 * $u) (162 * $u) (30 * $u) (40 * $u)
  $hi = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  Ellipse $hi (210 * $u) (168 * $u) (12 * $u) (12 * $u)
  Ellipse $hi (282 * $u) (168 * $u) (12 * $u) (12 * $u)

  # nose + mouth
  $nose = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 122, 165))
  Ellipse $nose (244 * $u) (198 * $u) (24 * $u) (18 * $u)
  $mPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 190, 90, 130), (6 * $u))
  $mPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($mPen, (246 * $u), (208 * $u), (26 * $u), (22 * $u), 40, 110)

  # blush
  $cheek = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140, 255, 140, 180))
  Ellipse $cheek (164 * $u) (196 * $u) (44 * $u) (26 * $u)
  Ellipse $cheek (304 * $u) (196 * $u) (44 * $u) (26 * $u)

  $g.Dispose()
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "saved $out"
}

New-RabbitIcon 192 "D:\yinyun\duoduo_Adventures\icons\icon-192.png"
New-RabbitIcon 512 "D:\yinyun\duoduo_Adventures\icons\icon-512.png"
New-RabbitIcon 180 "D:\yinyun\duoduo_Adventures\icons\apple-touch-icon.png"

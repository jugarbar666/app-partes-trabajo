/**
 * Catálogo oficial de precios de referencia para artículos y materiales de Fontanería Roma.
 * Permite blindar y recuperar automáticamente los importes de compra y venta en caso de
 * importaciones incompletas o campos pendientes en el catálogo.
 */
export const OFFICIAL_ROMA_ARTICLE_PRICES: Record<
  string,
  { purchase_price_cents: number | null; sale_price_cents: number | null }
> = {
  "MAT-0001": {
    "purchase_price_cents": 9,
    "sale_price_cents": 21
  },
  "MAT-0002": {
    "purchase_price_cents": 13,
    "sale_price_cents": 29
  },
  "MAT-0003": {
    "purchase_price_cents": 93,
    "sale_price_cents": 155
  },
  "MAT-0004": {
    "purchase_price_cents": 14,
    "sale_price_cents": 32
  },
  "MAT-0005": {
    "purchase_price_cents": 95,
    "sale_price_cents": 211
  },
  "MAT-0006": {
    "purchase_price_cents": 66,
    "sale_price_cents": 220
  },
  "MAT-0007": {
    "purchase_price_cents": 26,
    "sale_price_cents": 58
  },
  "MAT-0008": {
    "purchase_price_cents": 18,
    "sale_price_cents": 40
  },
  "MAT-0009": {
    "purchase_price_cents": 18,
    "sale_price_cents": 41
  },
  "MAT-0010": {
    "purchase_price_cents": 17,
    "sale_price_cents": 17
  },
  "MAT-0011": {
    "purchase_price_cents": 2423,
    "sale_price_cents": 3461
  },
  "MAT-0012": {
    "purchase_price_cents": 50,
    "sale_price_cents": 50
  },
  "MAT-0013": {
    "purchase_price_cents": 23,
    "sale_price_cents": 37
  },
  "MAT-0014": {
    "purchase_price_cents": 1472,
    "sale_price_cents": 2264
  },
  "MAT-0015": {
    "purchase_price_cents": 11773,
    "sale_price_cents": 19300
  },
  "MAT-0016": {
    "purchase_price_cents": 3640,
    "sale_price_cents": 5200
  },
  "MAT-0017": {
    "purchase_price_cents": 4110,
    "sale_price_cents": 6850
  },
  "MAT-0018": {
    "purchase_price_cents": 7869,
    "sale_price_cents": 12900
  },
  "MAT-0019": {
    "purchase_price_cents": 4110,
    "sale_price_cents": 6850
  },
  "MAT-0020": {
    "purchase_price_cents": 4468,
    "sale_price_cents": 6770
  },
  "MAT-0021": {
    "purchase_price_cents": 6588,
    "sale_price_cents": 10800
  },
  "MAT-0022": {
    "purchase_price_cents": 3172,
    "sale_price_cents": 5200
  },
  "MAT-0023": {
    "purchase_price_cents": 3172,
    "sale_price_cents": 5200
  },
  "MAT-0024": {
    "purchase_price_cents": 5220,
    "sale_price_cents": 8700
  },
  "MAT-0025": {
    "purchase_price_cents": 6820,
    "sale_price_cents": 12400
  },
  "MAT-0026": {
    "purchase_price_cents": 809,
    "sale_price_cents": 809
  },
  "MAT-0027": {
    "purchase_price_cents": 4256,
    "sale_price_cents": 6650
  },
  "MAT-0028": {
    "purchase_price_cents": 50,
    "sale_price_cents": 50
  },
  "MAT-0029": {
    "purchase_price_cents": 593,
    "sale_price_cents": 593
  },
  "MAT-0030": {
    "purchase_price_cents": 350,
    "sale_price_cents": 350
  },
  "MAT-0031": {
    "purchase_price_cents": 828,
    "sale_price_cents": 1656
  },
  "MAT-0032": {
    "purchase_price_cents": 911,
    "sale_price_cents": 1656
  },
  "MAT-0033": {
    "purchase_price_cents": 65000,
    "sale_price_cents": 65000
  },
  "MAT-0034": {
    "purchase_price_cents": 16,
    "sale_price_cents": 26
  },
  "MAT-0035": {
    "purchase_price_cents": 40,
    "sale_price_cents": 101
  },
  "MAT-0036": {
    "purchase_price_cents": 35,
    "sale_price_cents": 88
  },
  "MAT-0037": {
    "purchase_price_cents": 44,
    "sale_price_cents": 111
  },
  "MAT-0038": {
    "purchase_price_cents": 25,
    "sale_price_cents": 36
  },
  "MAT-0039": {
    "purchase_price_cents": 10521,
    "sale_price_cents": 16700
  },
  "MAT-0040": {
    "purchase_price_cents": 7872,
    "sale_price_cents": 12300
  },
  "MAT-0041": {
    "purchase_price_cents": 124,
    "sale_price_cents": 309
  },
  "MAT-0042": {
    "purchase_price_cents": 159,
    "sale_price_cents": 159
  },
  "MAT-0043": {
    "purchase_price_cents": 37,
    "sale_price_cents": 92
  },
  "MAT-0044": {
    "purchase_price_cents": 95,
    "sale_price_cents": 95
  },
  "MAT-0045": {
    "purchase_price_cents": 185,
    "sale_price_cents": 185
  },
  "MAT-0046": {
    "purchase_price_cents": 500,
    "sale_price_cents": 908
  },
  "MAT-0047": {
    "purchase_price_cents": 39,
    "sale_price_cents": 96
  },
  "MAT-0048": {
    "purchase_price_cents": 35,
    "sale_price_cents": 88
  },
  "MAT-0049": {
    "purchase_price_cents": 60,
    "sale_price_cents": 151
  },
  "MAT-0050": {
    "purchase_price_cents": 68,
    "sale_price_cents": 169
  },
  "MAT-0051": {
    "purchase_price_cents": 303,
    "sale_price_cents": 404
  },
  "MAT-0052": {
    "purchase_price_cents": 1373,
    "sale_price_cents": 2496
  },
  "MAT-0053": {
    "purchase_price_cents": 754,
    "sale_price_cents": 1371
  },
  "MAT-0054": {
    "purchase_price_cents": 134,
    "sale_price_cents": 336
  },
  "MAT-0055": {
    "purchase_price_cents": 350,
    "sale_price_cents": 700
  },
  "MAT-0056": {
    "purchase_price_cents": 165,
    "sale_price_cents": 589
  },
  "MAT-0057": {
    "purchase_price_cents": 50,
    "sale_price_cents": 80
  },
  "MAT-0058": {
    "purchase_price_cents": 38,
    "sale_price_cents": 61
  },
  "MAT-0059": {
    "purchase_price_cents": 356,
    "sale_price_cents": 685
  },
  "MAT-0060": {
    "purchase_price_cents": 14628,
    "sale_price_cents": 24380
  },
  "MAT-0061": {
    "purchase_price_cents": 10074,
    "sale_price_cents": 16790
  },
  "MAT-0062": {
    "purchase_price_cents": 98,
    "sale_price_cents": 98
  },
  "MAT-0063": {
    "purchase_price_cents": 187,
    "sale_price_cents": 187
  },
  "MAT-0064": {
    "purchase_price_cents": 21840,
    "sale_price_cents": 36400
  },
  "MAT-0065": {
    "purchase_price_cents": 59,
    "sale_price_cents": 178
  },
  "MAT-0066": {
    "purchase_price_cents": 3756,
    "sale_price_cents": 4695
  },
  "MAT-0067": {
    "purchase_price_cents": 289,
    "sale_price_cents": 723
  },
  "MAT-0068": {
    "purchase_price_cents": 534,
    "sale_price_cents": 821
  },
  "MAT-0069": {
    "purchase_price_cents": 69,
    "sale_price_cents": 173
  },
  "MAT-0070": {
    "purchase_price_cents": 209,
    "sale_price_cents": 209
  },
  "MAT-0071": {
    "purchase_price_cents": 213,
    "sale_price_cents": 213
  },
  "MAT-0072": {
    "purchase_price_cents": 264,
    "sale_price_cents": 659
  },
  "MAT-0073": {
    "purchase_price_cents": 254,
    "sale_price_cents": 636
  },
  "MAT-0074": {
    "purchase_price_cents": 800,
    "sale_price_cents": 800
  },
  "MAT-0075": {
    "purchase_price_cents": 232,
    "sale_price_cents": 232
  },
  "MAT-0076": {
    "purchase_price_cents": 11400,
    "sale_price_cents": 19000
  },
  "MAT-0077": {
    "purchase_price_cents": 4380,
    "sale_price_cents": 7300
  },
  "MAT-0078": {
    "purchase_price_cents": 1376,
    "sale_price_cents": 2502
  },
  "MAT-0079": {
    "purchase_price_cents": 19,
    "sale_price_cents": 31
  },
  "MAT-0080": {
    "purchase_price_cents": 258,
    "sale_price_cents": 538
  },
  "MAT-0081": {
    "purchase_price_cents": 685,
    "sale_price_cents": 1427
  },
  "MAT-0082": {
    "purchase_price_cents": 177,
    "sale_price_cents": 442
  },
  "MAT-0083": {
    "purchase_price_cents": 139,
    "sale_price_cents": 347
  },
  "MAT-0084": {
    "purchase_price_cents": 90,
    "sale_price_cents": 90
  },
  "MAT-0085": {
    "purchase_price_cents": 373,
    "sale_price_cents": 745
  },
  "MAT-0086": {
    "purchase_price_cents": 6000,
    "sale_price_cents": 10000
  },
  "MAT-0087": {
    "purchase_price_cents": 5400,
    "sale_price_cents": 9000
  },
  "MAT-0088": {
    "purchase_price_cents": 1470,
    "sale_price_cents": 1470
  },
  "MAT-0089": {
    "purchase_price_cents": 764,
    "sale_price_cents": 1176
  },
  "MAT-0090": {
    "purchase_price_cents": 5286,
    "sale_price_cents": 8810
  },
  "MAT-0091": {
    "purchase_price_cents": 161,
    "sale_price_cents": 161
  },
  "MAT-0092": {
    "purchase_price_cents": 1601,
    "sale_price_cents": 2668
  },
  "MAT-0093": {
    "purchase_price_cents": 702,
    "sale_price_cents": 1170
  },
  "MAT-0094": {
    "purchase_price_cents": 403,
    "sale_price_cents": 1120
  },
  "MAT-0095": {
    "purchase_price_cents": 864,
    "sale_price_cents": 1440
  },
  "MAT-0096": {
    "purchase_price_cents": 4830,
    "sale_price_cents": 8050
  },
  "MAT-0097": {
    "purchase_price_cents": 10521,
    "sale_price_cents": 16700
  },
  "MAT-0098": {
    "purchase_price_cents": 4595,
    "sale_price_cents": 7180
  },
  "MAT-0099": {
    "purchase_price_cents": 4595,
    "sale_price_cents": 7180
  },
  "MAT-0100": {
    "purchase_price_cents": 528,
    "sale_price_cents": 960
  },
  "MAT-0101": {
    "purchase_price_cents": 206,
    "sale_price_cents": 206
  },
  "MAT-0102": {
    "purchase_price_cents": 14,
    "sale_price_cents": 19
  },
  "MAT-0103": {
    "purchase_price_cents": 2,
    "sale_price_cents": 5
  },
  "MAT-0104": {
    "purchase_price_cents": 3,
    "sale_price_cents": 7
  },
  "MAT-0105": {
    "purchase_price_cents": 2,
    "sale_price_cents": 5
  },
  "MAT-0106": {
    "purchase_price_cents": 6,
    "sale_price_cents": 9
  },
  "MAT-0107": {
    "purchase_price_cents": 8,
    "sale_price_cents": 11
  },
  "MAT-0108": {
    "purchase_price_cents": 28,
    "sale_price_cents": 56
  },
  "MAT-0109": {
    "purchase_price_cents": 5000,
    "sale_price_cents": 5000
  },
  "MAT-0110": {
    "purchase_price_cents": 5000,
    "sale_price_cents": 5000
  },
  "MAT-0111": {
    "purchase_price_cents": 2346,
    "sale_price_cents": 3910
  },
  "MAT-0112": {
    "purchase_price_cents": 199,
    "sale_price_cents": 293
  },
  "MAT-0113": {
    "purchase_price_cents": 3082,
    "sale_price_cents": 4670
  },
  "MAT-0114": {
    "purchase_price_cents": 3135,
    "sale_price_cents": 4750
  },
  "MAT-0115": {
    "purchase_price_cents": 3557,
    "sale_price_cents": 5390
  },
  "MAT-0116": {
    "purchase_price_cents": 3450,
    "sale_price_cents": 5390
  },
  "MAT-0117": {
    "purchase_price_cents": 790,
    "sale_price_cents": 1053
  },
  "MAT-0118": {
    "purchase_price_cents": 958,
    "sale_price_cents": 1277
  },
  "MAT-0119": {
    "purchase_price_cents": 1630,
    "sale_price_cents": 2174
  },
  "MAT-0120": {
    "purchase_price_cents": 604,
    "sale_price_cents": 1511
  },
  "MAT-0121": {
    "purchase_price_cents": 630,
    "sale_price_cents": 1574
  },
  "MAT-0122": {
    "purchase_price_cents": 934,
    "sale_price_cents": 2336
  },
  "MAT-0123": {
    "purchase_price_cents": 832,
    "sale_price_cents": 2081
  },
  "MAT-0124": {
    "purchase_price_cents": 901,
    "sale_price_cents": 2253
  },
  "MAT-0125": {
    "purchase_price_cents": 50,
    "sale_price_cents": 178
  },
  "MAT-0126": {
    "purchase_price_cents": 15,
    "sale_price_cents": 24
  },
  "MAT-0127": {
    "purchase_price_cents": 350,
    "sale_price_cents": 778
  },
  "MAT-0128": {
    "purchase_price_cents": 235,
    "sale_price_cents": 586
  },
  "MAT-0129": {
    "purchase_price_cents": 253,
    "sale_price_cents": 633
  },
  "MAT-0130": {
    "purchase_price_cents": 270,
    "sale_price_cents": 385
  },
  "MAT-0131": {
    "purchase_price_cents": 1135,
    "sale_price_cents": 2365
  },
  "MAT-0132": {
    "purchase_price_cents": 82,
    "sale_price_cents": 206
  },
  "MAT-0133": {
    "purchase_price_cents": 264,
    "sale_price_cents": 440
  },
  "MAT-0134": {
    "purchase_price_cents": 26,
    "sale_price_cents": 64
  },
  "MAT-0135": {
    "purchase_price_cents": 135,
    "sale_price_cents": 337
  },
  "MAT-0136": {
    "purchase_price_cents": 40,
    "sale_price_cents": 99
  },
  "MAT-0137": {
    "purchase_price_cents": 190,
    "sale_price_cents": 574
  },
  "MAT-0138": {
    "purchase_price_cents": 310,
    "sale_price_cents": 563
  },
  "MAT-0139": {
    "purchase_price_cents": 655,
    "sale_price_cents": 655
  },
  "MAT-0140": {
    "purchase_price_cents": 394,
    "sale_price_cents": 984
  },
  "MAT-0141": {
    "purchase_price_cents": 205,
    "sale_price_cents": 372
  },
  "MAT-0142": {
    "purchase_price_cents": 216,
    "sale_price_cents": 432
  },
  "MAT-0143": {
    "purchase_price_cents": 16,
    "sale_price_cents": 29
  },
  "MAT-0144": {
    "purchase_price_cents": 115,
    "sale_price_cents": 287
  },
  "MAT-0145": {
    "purchase_price_cents": 371,
    "sale_price_cents": 927
  },
  "MAT-0146": {
    "purchase_price_cents": 380,
    "sale_price_cents": 633
  },
  "MAT-0147": {
    "purchase_price_cents": 307,
    "sale_price_cents": 639
  },
  "MAT-0148": {
    "purchase_price_cents": 284,
    "sale_price_cents": 592
  },
  "MAT-0149": {
    "purchase_price_cents": 94,
    "sale_price_cents": 94
  },
  "MAT-0150": {
    "purchase_price_cents": 133,
    "sale_price_cents": 222
  },
  "MAT-0151": {
    "purchase_price_cents": 695,
    "sale_price_cents": 1069
  },
  "MAT-0152": {
    "purchase_price_cents": 80,
    "sale_price_cents": 284
  },
  "MAT-0153": {
    "purchase_price_cents": 963,
    "sale_price_cents": 1376
  },
  "MAT-0154": {
    "purchase_price_cents": 936,
    "sale_price_cents": 1376
  },
  "MAT-0155": {
    "purchase_price_cents": 3025,
    "sale_price_cents": 5500
  },
  "MAT-0156": {
    "purchase_price_cents": 1925,
    "sale_price_cents": 3500
  },
  "MAT-0157": {
    "purchase_price_cents": 1925,
    "sale_price_cents": 3500
  },
  "MAT-0158": {
    "purchase_price_cents": 8280,
    "sale_price_cents": 13800
  },
  "MAT-0159": {
    "purchase_price_cents": 3542,
    "sale_price_cents": 6440
  },
  "MAT-0160": {
    "purchase_price_cents": 4140,
    "sale_price_cents": 6900
  },
  "MAT-0161": {
    "purchase_price_cents": 3864,
    "sale_price_cents": 6440
  },
  "MAT-0162": {
    "purchase_price_cents": 3036,
    "sale_price_cents": 5060
  },
  "MAT-0163": {
    "purchase_price_cents": 2150,
    "sale_price_cents": 3909
  },
  "MAT-0164": {
    "purchase_price_cents": 2530,
    "sale_price_cents": 4600
  },
  "MAT-0165": {
    "purchase_price_cents": 7260,
    "sale_price_cents": 13200
  },
  "MAT-0166": {
    "purchase_price_cents": 3480,
    "sale_price_cents": 6000
  },
  "MAT-0167": {
    "purchase_price_cents": 1480,
    "sale_price_cents": 2691
  },
  "MAT-0168": {
    "purchase_price_cents": 2622,
    "sale_price_cents": 4370
  },
  "MAT-0169": {
    "purchase_price_cents": 2880,
    "sale_price_cents": 4800
  },
  "MAT-0170": {
    "purchase_price_cents": 2160,
    "sale_price_cents": 3600
  },
  "MAT-0171": {
    "purchase_price_cents": 7800,
    "sale_price_cents": 13000
  },
  "MAT-0172": {
    "purchase_price_cents": 25380,
    "sale_price_cents": 42300
  },
  "MAT-0173": {
    "purchase_price_cents": 15600,
    "sale_price_cents": 26000
  },
  "MAT-0174": {
    "purchase_price_cents": 239,
    "sale_price_cents": 239
  },
  "MAT-0175": {
    "purchase_price_cents": 386,
    "sale_price_cents": 644
  },
  "MAT-0176": {
    "purchase_price_cents": 2779,
    "sale_price_cents": 4210
  },
  "MAT-0177": {
    "purchase_price_cents": 2694,
    "sale_price_cents": 4210
  },
  "MAT-0178": {
    "purchase_price_cents": 572,
    "sale_price_cents": 880
  },
  "MAT-0179": {
    "purchase_price_cents": 16335,
    "sale_price_cents": 29700
  },
  "MAT-0180": {
    "purchase_price_cents": 10945,
    "sale_price_cents": 19900
  },
  "MAT-0181": {
    "purchase_price_cents": 15180,
    "sale_price_cents": 27600
  },
  "MAT-0182": {
    "purchase_price_cents": 10700,
    "sale_price_cents": 10700
  },
  "MAT-0183": {
    "purchase_price_cents": 85,
    "sale_price_cents": 85
  },
  "MAT-0184": {
    "purchase_price_cents": 832,
    "sale_price_cents": 1189
  },
  "MAT-0185": {
    "purchase_price_cents": 181,
    "sale_price_cents": 241
  },
  "MAT-0186": {
    "purchase_price_cents": 736,
    "sale_price_cents": 982
  },
  "MAT-0187": {
    "purchase_price_cents": 992,
    "sale_price_cents": 1323
  },
  "MAT-0188": {
    "purchase_price_cents": 217,
    "sale_price_cents": 543
  },
  "MAT-0189": {
    "purchase_price_cents": 6923,
    "sale_price_cents": 6923
  },
  "MAT-0190": {
    "purchase_price_cents": 7912,
    "sale_price_cents": 7912
  },
  "MAT-0191": {
    "purchase_price_cents": 3795,
    "sale_price_cents": 6900
  },
  "MAT-0192": {
    "purchase_price_cents": 407,
    "sale_price_cents": 678
  },
  "MAT-0193": {
    "purchase_price_cents": 376,
    "sale_price_cents": 752
  },
  "MAT-0194": {
    "purchase_price_cents": 342,
    "sale_price_cents": 570
  },
  "MAT-0195": {
    "purchase_price_cents": 2320,
    "sale_price_cents": 5800
  },
  "MAT-0196": {
    "purchase_price_cents": 4000,
    "sale_price_cents": 10000
  },
  "MAT-0197": {
    "purchase_price_cents": 634,
    "sale_price_cents": 634
  },
  "MAT-0198": {
    "purchase_price_cents": 1056,
    "sale_price_cents": 2347
  },
  "MAT-0199": {
    "purchase_price_cents": 369,
    "sale_price_cents": 820
  },
  "MAT-0200": {
    "purchase_price_cents": 403,
    "sale_price_cents": 839
  },
  "MAT-0201": {
    "purchase_price_cents": 502,
    "sale_price_cents": 1115
  },
  "MAT-0202": {
    "purchase_price_cents": 626,
    "sale_price_cents": 1391
  },
  "MAT-0203": {
    "purchase_price_cents": 216,
    "sale_price_cents": 216
  },
  "MAT-0204": {
    "purchase_price_cents": 162,
    "sale_price_cents": 162
  },
  "MAT-0205": {
    "purchase_price_cents": 267,
    "sale_price_cents": 445
  },
  "MAT-0206": {
    "purchase_price_cents": 3200,
    "sale_price_cents": 3200
  },
  "MAT-0207": {
    "purchase_price_cents": 528,
    "sale_price_cents": 776
  },
  "MAT-0208": {
    "purchase_price_cents": 215,
    "sale_price_cents": 390
  },
  "MAT-0209": {
    "purchase_price_cents": 8,
    "sale_price_cents": 19
  },
  "MAT-0210": {
    "purchase_price_cents": 10332,
    "sale_price_cents": 16400
  },
  "MAT-0211": {
    "purchase_price_cents": 3477,
    "sale_price_cents": 5700
  },
  "MAT-0212": {
    "purchase_price_cents": 255,
    "sale_price_cents": 255
  },
  "MAT-0213": {
    "purchase_price_cents": 45,
    "sale_price_cents": 45
  },
  "MAT-0214": {
    "purchase_price_cents": 588,
    "sale_price_cents": 1175
  },
  "MAT-0215": {
    "purchase_price_cents": 773,
    "sale_price_cents": 1405
  },
  "MAT-0216": {
    "purchase_price_cents": 768,
    "sale_price_cents": 1535
  },
  "MAT-0217": {
    "purchase_price_cents": 1221,
    "sale_price_cents": 2220
  },
  "MAT-0218": {
    "purchase_price_cents": 2597,
    "sale_price_cents": 3710
  },
  "MAT-0219": {
    "purchase_price_cents": 160,
    "sale_price_cents": 332
  },
  "MAT-0220": {
    "purchase_price_cents": 47,
    "sale_price_cents": 174
  },
  "MAT-0221": {
    "purchase_price_cents": 15,
    "sale_price_cents": 24
  },
  "MAT-0222": {
    "purchase_price_cents": 24,
    "sale_price_cents": 39
  },
  "MAT-0223": {
    "purchase_price_cents": 15,
    "sale_price_cents": 24
  },
  "MAT-0224": {
    "purchase_price_cents": 58,
    "sale_price_cents": 58
  },
  "MAT-0225": {
    "purchase_price_cents": 107,
    "sale_price_cents": 222
  },
  "MAT-0226": {
    "purchase_price_cents": 98,
    "sale_price_cents": 246
  },
  "MAT-0227": {
    "purchase_price_cents": 190,
    "sale_price_cents": 190
  },
  "MAT-0228": {
    "purchase_price_cents": 124,
    "sale_price_cents": 259
  },
  "MAT-0229": {
    "purchase_price_cents": 119,
    "sale_price_cents": 248
  },
  "MAT-0230": {
    "purchase_price_cents": 9513,
    "sale_price_cents": 15100
  },
  "MAT-0231": {
    "purchase_price_cents": 164,
    "sale_price_cents": 410
  },
  "MAT-0232": {
    "purchase_price_cents": 195,
    "sale_price_cents": 697
  },
  "MAT-0233": {
    "purchase_price_cents": 571,
    "sale_price_cents": 1428
  },
  "MAT-0234": {
    "purchase_price_cents": 133,
    "sale_price_cents": 333
  },
  "MAT-0235": {
    "purchase_price_cents": 7500,
    "sale_price_cents": 7500
  },
  "MAT-0236": {
    "purchase_price_cents": 11200,
    "sale_price_cents": 11200
  },
  "MAT-0237": {
    "purchase_price_cents": 4,
    "sale_price_cents": 4
  },
  "MAT-0238": {
    "purchase_price_cents": 880,
    "sale_price_cents": 880
  },
  "MAT-0239": {
    "purchase_price_cents": 1050,
    "sale_price_cents": 1050
  },
  "MAT-0240": {
    "purchase_price_cents": 299,
    "sale_price_cents": 299
  },
  "MAT-0241": {
    "purchase_price_cents": 671,
    "sale_price_cents": 671
  },
  "MAT-0242": {
    "purchase_price_cents": 461,
    "sale_price_cents": 461
  },
  "MAT-0243": {
    "purchase_price_cents": 35,
    "sale_price_cents": 88
  },
  "MAT-0244": {
    "purchase_price_cents": 225,
    "sale_price_cents": 225
  },
  "MAT-0245": {
    "purchase_price_cents": 517,
    "sale_price_cents": 517
  },
  "MAT-0246": {
    "purchase_price_cents": 550,
    "sale_price_cents": 550
  },
  "MAT-0247": {
    "purchase_price_cents": 660,
    "sale_price_cents": 660
  },
  "MAT-0248": {
    "purchase_price_cents": 335,
    "sale_price_cents": 335
  },
  "MAT-0249": {
    "purchase_price_cents": 829,
    "sale_price_cents": 829
  },
  "MAT-0250": {
    "purchase_price_cents": 93,
    "sale_price_cents": 93
  },
  "MAT-0251": {
    "purchase_price_cents": 163,
    "sale_price_cents": 163
  },
  "MAT-0252": {
    "purchase_price_cents": 2209,
    "sale_price_cents": 3398
  },
  "MAT-0253": {
    "purchase_price_cents": 1084,
    "sale_price_cents": 1668
  },
  "MAT-0254": {
    "purchase_price_cents": 136,
    "sale_price_cents": 136
  },
  "MAT-0255": {
    "purchase_price_cents": 44,
    "sale_price_cents": 44
  },
  "MAT-0256": {
    "purchase_price_cents": 177,
    "sale_price_cents": 491
  },
  "MAT-0257": {
    "purchase_price_cents": 120,
    "sale_price_cents": 332
  },
  "MAT-0258": {
    "purchase_price_cents": 149,
    "sale_price_cents": 287
  },
  "MAT-0259": {
    "purchase_price_cents": 1612,
    "sale_price_cents": 3358
  },
  "MAT-0260": {
    "purchase_price_cents": 718,
    "sale_price_cents": 1196
  },
  "MAT-0261": {
    "purchase_price_cents": 386,
    "sale_price_cents": 773
  },
  "MAT-0262": {
    "purchase_price_cents": 1055,
    "sale_price_cents": 1918
  },
  "MAT-0263": {
    "purchase_price_cents": 332,
    "sale_price_cents": 443
  },
  "MAT-0264": {
    "purchase_price_cents": 706,
    "sale_price_cents": 1139
  },
  "MAT-0265": {
    "purchase_price_cents": 161,
    "sale_price_cents": 357
  }
};

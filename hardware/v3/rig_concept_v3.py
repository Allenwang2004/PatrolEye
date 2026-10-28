# PatrolEye enclosure v3: Raspberry Pi 5 + 2280 M.2 HAT + ASUS UGen300 M.2 (Hailo-10H).
# Generated from design.py (single geometry model; clash-checked). Massing model, not print-ready.
#   v1  = competition prototype as built (C-bracket pan, tilt tower, C270), base raised to 80 x 98 x 47 mm
#         for Pi 5 + 2280 M.2 HAT + UGen300 M.2 + 30 mm fan; servo board on the back of the pan post
#   p5  = Stage II build: v1's Pi 5 base stack (80 x 98 x 47 mm, no holes front or back, one 12 V cable
#         through the floor) with the compact head 21 mm ahead of centre; 120 mm tall overall
#   p5x = p5 exploded
#   v2  = after the competition, smaller (68 x 92 x 36 mm body, CM5 on one carrier board,
#         compact turret head with two STS3032 micro bus servos; 110 mm tall overall)
#   v1x = v1 exploded, for explaining the parts
#   vc  = for real deployment: v2 hung from the ceiling on a twist-lock plate (PoE through the plate),
#         turret below the body, barrel resting 35 degrees down; drops 114 mm from the ceiling
# Axes in mm: r = right (seen from the front), f = toward the lens, u = up.
# Run in Fusion: Text Commands (Py) ->  exec(open('/Users/coconut/tmp/fusion_test/rig_concept_v3.py').read())
import adsk.core, adsk.fusion, traceback, os, math, json

OUT_DIR = '/Users/coconut/tmp/fusion_test'
LOG = os.path.join(OUT_DIR, 'rig4_result.log')
DATA = json.loads(r"""{"v1": {"meta": {"HW": 40.0, "FR": 49.0, "RE": -49.0, "H": 47.0, "W": 3.0, "name": "v1 \u00b7 \u6bd4\u8cfd\u539f\u578b\uff08\u63db M.2 \u5f8c\uff09"}, "parts": [{"name": "Base shell", "color": "white", "group": "shell", "plus": [["rbox", -40.0, 40.0, -49.0, 49.0, 0, 44.0, 6]], "minus": [["box", -37.0, 37.0, -46.0, 46.0, 3.0, 48.0], ["box", -27, 27, -51.0, -44.0, 8, 25.5], ["box", -42.0, -35.0, 25.5, 36.5, 7, 14], ["box", -8, 8, 44.0, 51.0, 4.5, 8.5], ["cyl", [35.0, 1, 28], [42.0, 1, 28], 13.5], ["box", -20, 20, -36, -32, -1, 4.0], ["box", -20, 20, -24, -20, -1, 4.0], ["box", -20, 20, -12, -8, -1, 4.0], ["box", -20, 20, 0, 4, -1, 4.0], ["box", -20, 20, 12, 16, -1, 4.0], ["box", -20, 20, 24, 28, -1, 4.0], ["dside", -38.5, -20, 16, 5.5], ["dside", -38.5, -8, 16, 5.5], ["dside", -38.5, 4, 16, 5.5], ["dside", -38.5, 16, 16, 5.5], ["dside", -38.5, -20, 34, 5.5], ["dside", -38.5, -8, 34, 5.5], ["dside", -38.5, 4, 34, 5.5], ["dside", -38.5, 16, 34, 5.5]], "xray": false}, {"name": "Lid", "color": "white", "group": "lid", "plus": [["rbox", -40.0, 40.0, -49.0, 49.0, 44.0, 47.0, 6]], "minus": [["cyl", [-33.5, 42.5, 43.0], [-33.5, 42.5, 48.0], 1.7], ["cyl", [-33.5, -42.5, 43.0], [-33.5, -42.5, 48.0], 1.7], ["cyl", [33.5, 42.5, 43.0], [33.5, 42.5, 48.0], 1.7], ["cyl", [33.5, -42.5, 43.0], [33.5, -42.5, 48.0], 1.7], ["box", -24, 24, -43.0, -40.5, 43.0, 48.0], ["box", -24, 24, -38.5, -36.0, 43.0, 48.0], ["box", -24, 24, -34.0, -31.5, 43.0, 48.0], ["box", -24, 24, -29.5, -27.0, 43.0, 48.0]], "xray": false}, {"name": "Mounting tab", "color": "white", "group": "shell", "plus": [["box", -47.0, -40.0, -30, -18, 0, 3]], "minus": [["cyl", [-43.5, -24, -1], [-43.5, -24, 4], 1.7]], "xray": false}, {"name": "Mounting tab", "color": "white", "group": "shell", "plus": [["box", -47.0, -40.0, 18, 30, 0, 3]], "minus": [["cyl", [-43.5, 24, -1], [-43.5, 24, 4], 1.7]], "xray": false}, {"name": "Mounting tab", "color": "white", "group": "shell", "plus": [["box", 40.0, 47.0, -30, -18, 0, 3]], "minus": [["cyl", [43.5, -24, -1], [43.5, -24, 4], 1.7]], "xray": false}, {"name": "Mounting tab", "color": "white", "group": "shell", "plus": [["box", 40.0, 47.0, 18, 30, 0, 3]], "minus": [["cyl", [43.5, 24, -1], [43.5, 24, 4], 1.7]], "xray": false}, {"name": "1/4\"-20 tripod / ceiling insert", "color": "silver", "group": "shell", "plus": [["cyl", [0, 0, 0], [0, 0, 8], 4.5]], "minus": [], "xray": false}, {"name": "Fan grille", "color": "white", "group": "shell", "plus": [["box", 37.0, 39.4, -13, 15, 20, 22], ["box", 37.0, 39.4, -13, 15, 27, 29], ["box", 37.0, 39.4, -13, 15, 34, 36], ["box", 37.0, 39.4, 0, 2, 14.5, 41.5]], "minus": [], "xray": false}, {"name": "Lid screw boss", "color": "white", "group": "boss", "plus": [["cyl", [-33.5, 42.5, 3.0], [-33.5, 42.5, 44.0], 3.0]], "minus": [["cyl", [-33.5, 42.5, 35.0], [-33.5, 42.5, 44.1], 1.25]], "xray": false}, {"name": "Lid screw boss", "color": "white", "group": "boss", "plus": [["cyl", [-33.5, -42.5, 3.0], [-33.5, -42.5, 44.0], 3.0]], "minus": [["cyl", [-33.5, -42.5, 35.0], [-33.5, -42.5, 44.1], 1.25]], "xray": false}, {"name": "Lid screw boss", "color": "white", "group": "boss", "plus": [["cyl", [33.5, 42.5, 3.0], [33.5, 42.5, 44.0], 3.0]], "minus": [["cyl", [33.5, 42.5, 35.0], [33.5, 42.5, 44.1], 1.25]], "xray": false}, {"name": "Lid screw boss", "color": "white", "group": "boss", "plus": [["cyl", [33.5, -42.5, 3.0], [33.5, -42.5, 44.0], 3.0]], "minus": [["cyl", [33.5, -42.5, 35.0], [33.5, -42.5, 44.1], 1.25]], "xray": false}, {"name": "Pi standoff 4 mm", "color": "brass", "group": "pi", "plus": [["cyl", [24.5, 38.5, 3.0], [24.5, 38.5, 7.0], 2.75]], "minus": [], "xray": false}, {"name": "Pi standoff 4 mm", "color": "brass", "group": "pi", "plus": [["cyl", [24.5, -19.5, 3.0], [24.5, -19.5, 7.0], 2.75]], "minus": [], "xray": false}, {"name": "Pi standoff 4 mm", "color": "brass", "group": "pi", "plus": [["cyl", [-24.5, 38.5, 3.0], [-24.5, 38.5, 7.0], 2.75]], "minus": [], "xray": false}, {"name": "Pi standoff 4 mm", "color": "brass", "group": "pi", "plus": [["cyl", [-24.5, -19.5, 3.0], [-24.5, -19.5, 7.0], 2.75]], "minus": [], "xray": false}, {"name": "Raspberry Pi 5 (85x56)", "color": "green", "group": "pi", "plus": [["box", -28, 28, -43.0, 42.0, 7.0, 8.6]], "minus": [], "xray": false}, {"name": "Pi USB 2.0", "color": "silver", "group": "pi", "plus": [["box", -25.5, -12.5, -46.0, -28.5, 8.6, 24.6]], "minus": [], "xray": false}, {"name": "Pi USB 3.0", "color": "silver", "group": "pi", "plus": [["box", -8.5, 4.5, -46.0, -28.5, 8.6, 24.6]], "minus": [], "xray": false}, {"name": "Pi Ethernet", "color": "silver", "group": "pi", "plus": [["box", 10, 26, -46.0, -25.0, 8.6, 22.1]], "minus": [], "xray": false}, {"name": "Pi active cooler", "color": "silver", "group": "pi", "plus": [["box", -17, 13, -19, 11, 8.6, 17.6]], "minus": [], "xray": false}, {"name": "Pi GPIO header", "color": "black", "group": "pi", "plus": [["box", 22.5, 27.5, -15.0, 35.0, 8.6, 17.1]], "minus": [], "xray": false}, {"name": "Pi USB-C power", "color": "silver", "group": "pi", "plus": [["box", -31, -24, 26.5, 35.5, 8.6, 11.8]], "minus": [], "xray": false}, {"name": "Pi micro-HDMI x2", "color": "silver", "group": "pi", "plus": [["box", -30, -24, -1.0, 20.0, 8.6, 12.1]], "minus": [], "xray": false}, {"name": "Pi PCIe FPC connector", "color": "black", "group": "pi", "plus": [["box", -9, 9, 38.0, 42.0, 8.6, 10.6]], "minus": [], "xray": false}, {"name": "microSD card", "color": "black", "group": "pi", "plus": [["box", -6, 6, 30.0, 44.0, 5.6, 7.0]], "minus": [], "xray": false}, {"name": "HAT standoff 16 mm", "color": "brass", "group": "hat", "plus": [["cyl", [24.5, 38.5, 8.6], [24.5, 38.5, 24.6], 2.75]], "minus": [], "xray": false}, {"name": "HAT standoff 16 mm", "color": "brass", "group": "hat", "plus": [["cyl", [24.5, -19.5, 8.6], [24.5, -19.5, 24.6], 2.75]], "minus": [], "xray": false}, {"name": "HAT standoff 16 mm", "color": "brass", "group": "hat", "plus": [["cyl", [-24.5, 38.5, 8.6], [-24.5, 38.5, 24.6], 2.75]], "minus": [], "xray": false}, {"name": "HAT standoff 16 mm", "color": "brass", "group": "hat", "plus": [["cyl", [-24.5, -19.5, 8.6], [-24.5, -19.5, 24.6], 2.75]], "minus": [], "xray": false}, {"name": "M.2 HAT for 2280 (PCIe, top of Pi)", "color": "green", "group": "hat", "plus": [["box", -28, 28, -43.0, 44.0, 24.6, 26.200000000000003]], "minus": [], "xray": false}, {"name": "PCIe FFC ribbon", "color": "amber", "group": "hat", "plus": [["box", -8, 8, 42.2, 43.2, 10.6, 24.6]], "minus": [], "xray": false}, {"name": "M.2 Key-M socket", "color": "black", "group": "hat", "plus": [["box", -11, 11, 37.5, 43.0, 26.200000000000003, 30.900000000000002]], "minus": [], "xray": false}, {"name": "UGen300 M.2 card (2280)", "color": "pcb", "group": "ai", "plus": [["box", -11, 11, -38.0, 42.0, 28.400000000000002, 29.200000000000003]], "minus": [], "xray": false}, {"name": "Hailo-10H", "color": "black", "group": "ai", "plus": [["box", -8, 8, -8.0, 9.0, 29.200000000000003, 30.400000000000002]], "minus": [], "xray": false}, {"name": "LPDDR4 8 GB", "color": "black", "group": "ai", "plus": [["box", -7, 7, -28.0, -15.0, 29.200000000000003, 30.200000000000003], ["box", -7, 7, 15.0, 28.0, 29.200000000000003, 30.200000000000003]], "minus": [], "xray": false}, {"name": "Heatsink on Hailo-10H", "color": "silver", "group": "ai", "plus": [["box", -10, 10, -12.0, 13.0, 30.400000000000002, 38.400000000000006]], "minus": [], "xray": false}, {"name": "M.2 screw post", "color": "brass", "group": "hat", "plus": [["cyl", [0, -36.0, 26.200000000000003], [0, -36.0, 28.400000000000002], 2.0]], "minus": [], "xray": false}, {"name": "30 mm exhaust fan", "color": "black", "group": "cool", "plus": [["box", 30.0, 37.0, -14, 16, 13, 43]], "minus": [], "xray": false}, {"name": "Pan servo post (fixed)", "color": "white", "group": "head", "plus": [["box", 2, 30, -17.35, -7.35, 47.0, 99.0], ["box", -2, 34, -21.35, -7.35, 47.0, 50.0]], "minus": [], "xray": false}, {"name": "Pan servo STS3215", "color": "black", "group": "head", "plus": [["box", -11.5, 33.7, -7.35, 17.35, 64.0, 99.0]], "minus": [], "xray": false}, {"name": "Pan servo discs", "color": "silver", "group": "head", "plus": [["cyl", [0, 5.0, 61.0], [0, 5.0, 64.0], 10], ["cyl", [0, 5.0, 99.0], [0, 5.0, 102.0], 10]], "minus": [], "xray": false}, {"name": "Pan C-bracket (turns)", "color": "white", "group": "head", "plus": [["box", -11, 11, 5.0, 45.0, 49.0, 61.0], ["cyl", [0, 5.0, 49.0], [0, 5.0, 61.0], 11], ["box", -11, 11, 5.0, 45.0, 102.0, 114.0], ["cyl", [0, 5.0, 102.0], [0, 5.0, 114.0], 11], ["box", -14, 14, 31.0, 45.0, 49.0, 114.0]], "minus": [], "xray": false}, {"name": "Tilt tower", "color": "white", "group": "head", "plus": [["box", -20.5, 20.5, 17.65, 48.35, 114.0, 147.0]], "minus": [["box", -17.6, 17.6, 20.55, 45.45, 126.9, 148.0]], "xray": false}, {"name": "Tilt servo STS3215", "color": "black", "group": "head", "plus": [["box", -17.5, 17.5, 20.65, 45.35, 127.0, 172.2]], "minus": [], "xray": false}, {"name": "Tilt horn", "color": "silver", "group": "head", "plus": [["cyl", [17.5, 33.0, 160.7], [20.5, 33.0, 160.7], 10]], "minus": [], "xray": false}, {"name": "Camera yoke (printed)", "color": "white", "group": "head", "plus": [["box", 20.5, 24.5, 23.0, 43.0, 149.0, 183.0], ["box", -24.5, -20.5, 23.0, 43.0, 149.0, 183.0], ["box", -24.5, 24.5, 23.0, 43.0, 179.0, 183.0], ["box", -8, 8, 23.0, 43.0, 183.0, 193.0]], "minus": [], "xray": false}, {"name": "USB webcam (Logitech C270)", "color": "black", "group": "head", "plus": [["box", -20, 20, 21.5, 44.5, 193.0, 224.5], ["cyl", [-20, 21.5, 208.75], [-20, 44.5, 208.75], 15.75], ["cyl", [20, 21.5, 208.75], [20, 44.5, 208.75], 15.75]], "minus": [], "xray": false}, {"name": "Webcam lens", "color": "glass", "group": "head", "plus": [["cyl", [-12, 44.5, 208.75], [-12, 46.5, 208.75], 7]], "minus": [], "xray": false}, {"name": "Bus servo adapter (A)", "color": "pcb", "group": "head", "plus": [["box", -1, 32, -18.950000000000003, -17.35, 55.0, 97.0]], "minus": [], "xray": false}, {"name": "Adapter screw terminal (12 V in)", "color": "green", "group": "head", "plus": [["box", 1, 9, -26.950000000000003, -18.950000000000003, 55.0, 63.0]], "minus": [], "xray": false}, {"name": "Adapter USB-C (to Pi)", "color": "silver", "group": "head", "plus": [["box", 21, 30, -22.150000000000002, -18.950000000000003, 55.0, 62.0]], "minus": [], "xray": false}, {"name": "Servo ports", "color": "white", "group": "head", "plus": [["box", 3, 11, -24.35, -18.950000000000003, 91.0, 97.0], ["box", 19, 27, -24.35, -18.950000000000003, 91.0, 97.0]], "minus": [], "xray": false}]}, "p5": {"meta": {"HW": 40.0, "FR": 49.0, "RE": -49.0, "H": 47.0, "W": 3.0, "pan_f": 21.0, "name": "p5 \u00b7 \u8907\u8cfd\u7248\uff08Pi 5 \u5e95\u5ea7\uff09"}, "parts": [{"name": "Base shell", "color": "white", "group": "shell", "plus": [["rbox", -40.0, 40.0, -49.0, 49.0, 0, 44.0, 6]], "minus": [["box", -37.0, 37.0, -46.0, 46.0, 3.0, 48.0], ["box", -20, -6, -36, -32, -1, 4.0], ["box", 6, 20, -36, -32, -1, 4.0], ["box", -20, -6, -24, -20, -1, 4.0], ["box", 6, 20, -24, -20, -1, 4.0], ["box", -20, -6, -12, -8, -1, 4.0], ["box", 6, 20, -12, -8, -1, 4.0], ["box", -20, -6, 0, 4, -1, 4.0], ["box", 6, 20, 0, 4, -1, 4.0], ["box", -20, -6, 12, 16, -1, 4.0], ["box", 6, 20, 12, 16, -1, 4.0], ["box", -20, -6, 24, 28, -1, 4.0], ["box", 6, 20, 24, 28, -1, 4.0], ["box", 36.0, 41.0, -12, 14, 15.5, 17.3], ["box", 36.0, 41.0, -12, 14, 19.1, 20.900000000000002], ["box", 36.0, 41.0, -12, 14, 22.7, 24.5], ["box", 36.0, 41.0, -12, 14, 26.3, 28.1], ["box", 36.0, 41.0, -12, 14, 29.9, 31.7], ["box", 36.0, 41.0, -12, 14, 33.5, 35.3], ["box", 36.0, 41.0, -12, 14, 37.1, 38.9], ["cyl", [-33, 12, -1], [-33, 12, 4.0], 3.5], ["box", -36, -30, -50.0, 12, -1, 1.2], ["box", -7, 7, 31, 45, -1, 4.0]], "xray": false}, {"name": "Lid", "color": "white", "group": "lid", "plus": [["rbox", -40.0, 40.0, -49.0, 49.0, 44.0, 47.0, 6]], "minus": [["cyl", [-33.5, 42.5, 43.0], [-33.5, 42.5, 48.0], 1.7], ["cyl", [-33.5, -42.5, 43.0], [-33.5, -42.5, 48.0], 1.7], ["cyl", [33.5, 42.5, 43.0], [33.5, 42.5, 48.0], 1.7], ["cyl", [33.5, -42.5, 43.0], [33.5, -42.5, 48.0], 1.7], ["box", -7, 7, 14.1, 39.3, 43.0, 48.0], ["box", 13, 17, 12.0, 20.0, 43.0, 48.0]], "xray": false}, {"name": "Rubber foot", "color": "black", "group": "shell", "plus": [["cyl", [-24, -40, -4], [-24, -40, 0], 5]], "minus": [], "xray": false}, {"name": "Rubber foot", "color": "black", "group": "shell", "plus": [["cyl", [-24, 40, -4], [-24, 40, 0], 5]], "minus": [], "xray": false}, {"name": "Rubber foot", "color": "black", "group": "shell", "plus": [["cyl", [24, -40, -4], [24, -40, 0], 5]], "minus": [], "xray": false}, {"name": "Rubber foot", "color": "black", "group": "shell", "plus": [["cyl", [24, 40, -4], [24, 40, 0], 5]], "minus": [], "xray": false}, {"name": "1/4\"-20 tripod / ceiling insert", "color": "silver", "group": "shell", "plus": [["cyl", [0, 0, 0], [0, 0, 8], 4.5]], "minus": [], "xray": false}, {"name": "Lid screw boss", "color": "white", "group": "boss", "plus": [["cyl", [-33.5, 42.5, 3.0], [-33.5, 42.5, 44.0], 3.0]], "minus": [["cyl", [-33.5, 42.5, 35.0], [-33.5, 42.5, 44.1], 1.25]], "xray": false}, {"name": "Lid screw boss", "color": "white", "group": "boss", "plus": [["cyl", [-33.5, -42.5, 3.0], [-33.5, -42.5, 44.0], 3.0]], "minus": [["cyl", [-33.5, -42.5, 35.0], [-33.5, -42.5, 44.1], 1.25]], "xray": false}, {"name": "Lid screw boss", "color": "white", "group": "boss", "plus": [["cyl", [33.5, 42.5, 3.0], [33.5, 42.5, 44.0], 3.0]], "minus": [["cyl", [33.5, 42.5, 35.0], [33.5, 42.5, 44.1], 1.25]], "xray": false}, {"name": "Lid screw boss", "color": "white", "group": "boss", "plus": [["cyl", [33.5, -42.5, 3.0], [33.5, -42.5, 44.0], 3.0]], "minus": [["cyl", [33.5, -42.5, 35.0], [33.5, -42.5, 44.1], 1.25]], "xray": false}, {"name": "Pi standoff 4 mm", "color": "brass", "group": "pi", "plus": [["cyl", [24.5, 38.5, 3.0], [24.5, 38.5, 7.0], 2.75]], "minus": [], "xray": false}, {"name": "Pi standoff 4 mm", "color": "brass", "group": "pi", "plus": [["cyl", [24.5, -19.5, 3.0], [24.5, -19.5, 7.0], 2.75]], "minus": [], "xray": false}, {"name": "Pi standoff 4 mm", "color": "brass", "group": "pi", "plus": [["cyl", [-24.5, 38.5, 3.0], [-24.5, 38.5, 7.0], 2.75]], "minus": [], "xray": false}, {"name": "Pi standoff 4 mm", "color": "brass", "group": "pi", "plus": [["cyl", [-24.5, -19.5, 3.0], [-24.5, -19.5, 7.0], 2.75]], "minus": [], "xray": false}, {"name": "Raspberry Pi 5 (85x56)", "color": "green", "group": "pi", "plus": [["box", -28, 28, -43.0, 42.0, 7.0, 8.6]], "minus": [], "xray": false}, {"name": "Pi USB 2.0", "color": "silver", "group": "pi", "plus": [["box", -25.5, -12.5, -46.0, -28.5, 8.6, 24.6]], "minus": [], "xray": false}, {"name": "Pi USB 3.0", "color": "silver", "group": "pi", "plus": [["box", -8.5, 4.5, -46.0, -28.5, 8.6, 24.6]], "minus": [], "xray": false}, {"name": "Pi Ethernet", "color": "silver", "group": "pi", "plus": [["box", 10, 26, -46.0, -25.0, 8.6, 22.1]], "minus": [], "xray": false}, {"name": "Pi active cooler", "color": "silver", "group": "pi", "plus": [["box", -17, 13, -19, 11, 8.6, 17.6]], "minus": [], "xray": false}, {"name": "Pi GPIO header", "color": "black", "group": "pi", "plus": [["box", 22.5, 27.5, -15.0, 35.0, 8.6, 17.1]], "minus": [], "xray": false}, {"name": "Pi USB-C power", "color": "silver", "group": "pi", "plus": [["box", -31, -24, 26.5, 35.5, 8.6, 11.8]], "minus": [], "xray": false}, {"name": "Pi micro-HDMI x2", "color": "silver", "group": "pi", "plus": [["box", -30, -24, -1.0, 20.0, 8.6, 12.1]], "minus": [], "xray": false}, {"name": "Pi PCIe FPC connector", "color": "black", "group": "pi", "plus": [["box", -9, 9, 38.0, 42.0, 8.6, 10.6]], "minus": [], "xray": false}, {"name": "microSD card", "color": "black", "group": "pi", "plus": [["box", -6, 6, 30.0, 44.0, 5.6, 7.0]], "minus": [], "xray": false}, {"name": "HAT standoff 16 mm", "color": "brass", "group": "hat", "plus": [["cyl", [24.5, 38.5, 8.6], [24.5, 38.5, 24.6], 2.75]], "minus": [], "xray": false}, {"name": "HAT standoff 16 mm", "color": "brass", "group": "hat", "plus": [["cyl", [24.5, -19.5, 8.6], [24.5, -19.5, 24.6], 2.75]], "minus": [], "xray": false}, {"name": "HAT standoff 16 mm", "color": "brass", "group": "hat", "plus": [["cyl", [-24.5, 38.5, 8.6], [-24.5, 38.5, 24.6], 2.75]], "minus": [], "xray": false}, {"name": "HAT standoff 16 mm", "color": "brass", "group": "hat", "plus": [["cyl", [-24.5, -19.5, 8.6], [-24.5, -19.5, 24.6], 2.75]], "minus": [], "xray": false}, {"name": "M.2 HAT for 2280 (PCIe, top of Pi)", "color": "green", "group": "hat", "plus": [["box", -28, 28, -43.0, 44.0, 24.6, 26.200000000000003]], "minus": [], "xray": false}, {"name": "PCIe FFC ribbon", "color": "amber", "group": "hat", "plus": [["box", -8, 8, 42.2, 43.2, 10.6, 24.6]], "minus": [], "xray": false}, {"name": "M.2 Key-M socket", "color": "black", "group": "hat", "plus": [["box", -11, 11, 37.5, 43.0, 26.200000000000003, 30.900000000000002]], "minus": [], "xray": false}, {"name": "UGen300 M.2 card (2280)", "color": "pcb", "group": "ai", "plus": [["box", -11, 11, -38.0, 42.0, 28.400000000000002, 29.200000000000003]], "minus": [], "xray": false}, {"name": "Hailo-10H", "color": "black", "group": "ai", "plus": [["box", -8, 8, -8.0, 9.0, 29.200000000000003, 30.400000000000002]], "minus": [], "xray": false}, {"name": "LPDDR4 8 GB", "color": "black", "group": "ai", "plus": [["box", -7, 7, -28.0, -15.0, 29.200000000000003, 30.200000000000003], ["box", -7, 7, 15.0, 28.0, 29.200000000000003, 30.200000000000003]], "minus": [], "xray": false}, {"name": "Heatsink on Hailo-10H", "color": "silver", "group": "ai", "plus": [["box", -10, 10, -12.0, 13.0, 30.400000000000002, 38.400000000000006]], "minus": [], "xray": false}, {"name": "M.2 screw post", "color": "brass", "group": "hat", "plus": [["cyl", [0, -36.0, 26.200000000000003], [0, -36.0, 28.400000000000002], 2.0]], "minus": [], "xray": false}, {"name": "30 mm exhaust fan", "color": "black", "group": "cool", "plus": [["box", 30.0, 37.0, -14, 16, 13, 43]], "minus": [], "xray": false}, {"name": "Bus servo adapter (A)", "color": "pcb", "group": "power", "plus": [["box", -37.0, -31.0, -36, 6, 10, 43]], "minus": [], "xray": false}, {"name": "Buck 12 V to 5 V 5 A (Pi)", "color": "blue", "group": "power", "plus": [["box", -28, -14, -40, -14, 28.5, 37]], "minus": [], "xray": false}, {"name": "Buck 12 V to 6 V (servos)", "color": "blue", "group": "power", "plus": [["box", -28, -16, -8, 10, 28.5, 34]], "minus": [], "xray": false}, {"name": "Pan servo STS3032", "color": "black", "group": "head", "plus": [["box", -6.05, 6.05, 15.1, 38.3, 35.0, 60.0], ["cyl", [0, 21.0, 60.0], [0, 21.0, 63.5], 3.0], ["box", -6.05, 6.05, 10.55, 42.849999999999994, 53.0, 55.5]], "minus": [], "xray": false}, {"name": "Pan horn", "color": "silver", "group": "head", "plus": [["cyl", [0, 21.0, 63.5], [0, 21.0, 65.5], 10]], "minus": [], "xray": false}, {"name": "Pedestal (fixed)", "color": "white", "group": "head", "plus": [["cyl", [0, 21.0, 47.0], [0, 21.0, 53.0], 25]], "minus": [["cyl", [0, 21.0, 46.0], [0, 21.0, 50.5], 23], ["box", -6.35, 6.35, 14.9, 38.5, 46.0, 54.0], ["box", 13, 17, 12.0, 20.0, 46.0, 54.0]], "xray": true}, {"name": "PTFE washer", "color": "white", "group": "head", "plus": [["cyl", [0, 21.0, 53.0], [0, 21.0, 54.0], 25]], "minus": [["cyl", [0, 21.0, 52.0], [0, 21.0, 55.0], 21.5]], "xray": false}, {"name": "Turret (rotates)", "color": "white", "group": "head", "plus": [["cyl", [0, 21.0, 54.0], [0, 21.0, 67.5], 25]], "minus": [["cyl", [0, 21.0, 53.0], [0, 21.0, 65.5], 23]], "xray": true}, {"name": "U bracket", "color": "white", "group": "head", "plus": [["rbox", -31.6, 31.6, 10.0, 32.0, 67.5, 70.5, 4], ["box", -31.6, -28.6, 10.0, 32.0, 70.5, 95.5], ["cyl", [-31.6, 21.0, 95.5], [-28.6, 21.0, 95.5], 11], ["box", 28.6, 31.6, 10.0, 32.0, 70.5, 95.5], ["cyl", [28.6, 21.0, 95.5], [31.6, 21.0, 95.5], 11]], "minus": [["cyl", [-29.4, 21.0, 95.5], [-28.4, 21.0, 95.5], 9.8], ["cyl", [28.4, 21.0, 95.5], [31.8, 21.0, 95.5], 8.5]], "xray": true}, {"name": "Tilt horn (bolted to the left cheek)", "color": "silver", "group": "head", "plus": [["cyl", [-29.4, 21.0, 95.5], [-28.2, 21.0, 95.5], 9.5]], "minus": [], "xray": false}, {"name": "Horn screws", "color": "black", "group": "head", "plus": [["cyl", [-31.95, 14.5, 95.5], [-31.6, 14.5, 95.5], 1.5], ["cyl", [-31.95, 27.5, 95.5], [-31.6, 27.5, 95.5], 1.5]], "minus": [], "xray": false}, {"name": "Right pivot bearing", "color": "silver", "group": "head", "plus": [["cyl", [28.4, 21.0, 95.5], [31.8, 21.0, 95.5], 8.5]], "minus": [["cyl", [28.0, 21.0, 95.5], [32.2, 21.0, 95.5], 6.0]], "xray": false}, {"name": "Hollow pivot shaft", "color": "silver", "group": "head", "plus": [["cyl", [27.0, 21.0, 95.5], [32.2, 21.0, 95.5], 6.0]], "minus": [["cyl", [26.0, 21.0, 95.5], [33.0, 21.0, 95.5], 3.0]], "xray": false}, {"name": "Camera barrel (tilts)", "color": "white", "group": "head", "plus": [["cyl", [-28, 21.0, 95.5], [28, 21.0, 95.5], 21]], "minus": [], "xray": true}, {"name": "Tilt servo STS3032 (inside the barrel)", "color": "black", "group": "head", "plus": [["box", -27.5, 0, 3.700000000000003, 26.9, 89.45, 101.55], ["cyl", [-29.0, 21.0, 95.5], [-27.5, 21.0, 95.5], 3.0]], "minus": [], "xray": false}, {"name": "Camera Module 3", "color": "green", "group": "head", "plus": [["box", -12.5, 12.5, 28.0, 29.0, 83.5, 107.5], ["box", -4.25, 4.25, 29.0, 39.0, 91.25, 99.75]], "minus": [], "xray": false}, {"name": "Lens bezel", "color": "black", "group": "head", "plus": [["cyl", [0, 39.0, 95.5], [0, 43.5, 95.5], 8]], "minus": [], "xray": false}, {"name": "Light ring", "color": "white", "group": "head", "plus": [["cyl", [0, 39.0, 95.5], [0, 43.0, 95.5], 9.4]], "minus": [["cyl", [0, 38.0, 95.5], [0, 44.0, 95.5], 8.0]], "xray": false}, {"name": "Camera lens", "color": "glass", "group": "head", "plus": [["cyl", [0, 43.5, 95.5], [0, 44.0, 95.5], 5.5]], "minus": [], "xray": false}]}, "v2": {"meta": {"HW": 34.0, "FR": 46.0, "RE": -46.0, "H": 36.0, "W": 3.0, "pan_f": -2.0, "name": "v2 \u00b7 \u6bd4\u8cfd\u5f8c\u7e2e\u5c0f\u7248"}, "parts": [{"name": "Base shell", "color": "white", "group": "shell", "plus": [["rbox", -34.0, 34.0, -46.0, 46.0, 0, 33.0, 6]], "minus": [["box", -31.0, 31.0, -43.0, 43.0, 3.0, 37.0], ["box", -18, 18, -32, -28, -1, 4.0], ["box", -18, 18, -20, -16, -1, 4.0], ["box", -18, 18, -8, -4, -1, 4.0], ["box", -18, 18, 4, 8, -1, 4.0], ["box", -18, 18, 16, 20, -1, 4.0], ["box", -18, 18, 28, 32, -1, 4.0], ["box", 30.0, 35.0, -39, -22, 28.6, 29.8], ["box", 30.0, 35.0, -39, -22, 30.8, 32.0], ["cyl", [-8, -40, -1], [-8, -40, 4.0], 3.2], ["box", -11, -5, -47.0, -40, -1, 1.2]], "xray": false}, {"name": "Lid", "color": "white", "group": "lid", "plus": [["rbox", -34.0, 34.0, -46.0, 46.0, 33.0, 36.0, 6]], "minus": [["box", -7, 7, -20.299999999999997, 4.9, 32.0, 37.0], ["box", 13, 17, -11.0, -3.0, 32.0, 37.0]], "xray": false}, {"name": "Rubber foot", "color": "black", "group": "shell", "plus": [["cyl", [-26, -38, -4], [-26, -38, 0], 5]], "minus": [], "xray": false}, {"name": "Rubber foot", "color": "black", "group": "shell", "plus": [["cyl", [-26, 38, -4], [-26, 38, 0], 5]], "minus": [], "xray": false}, {"name": "Rubber foot", "color": "black", "group": "shell", "plus": [["cyl", [26, -38, -4], [26, -38, 0], 5]], "minus": [], "xray": false}, {"name": "Rubber foot", "color": "black", "group": "shell", "plus": [["cyl", [26, 38, -4], [26, 38, 0], 5]], "minus": [], "xray": false}, {"name": "Carrier standoff", "color": "brass", "group": "board", "plus": [["cyl", [-26, -38, 3.0], [-26, -38, 13], 2.5]], "minus": [], "xray": false}, {"name": "Carrier standoff", "color": "brass", "group": "board", "plus": [["cyl", [-26, 38, 3.0], [-26, 38, 13], 2.5]], "minus": [], "xray": false}, {"name": "Carrier standoff", "color": "brass", "group": "board", "plus": [["cyl", [26, -38, 3.0], [26, -38, 13], 2.5]], "minus": [], "xray": false}, {"name": "Carrier standoff", "color": "brass", "group": "board", "plus": [["cyl", [26, 38, 3.0], [26, 38, 13], 2.5]], "minus": [], "xray": false}, {"name": "Camera CSI connector", "color": "black", "group": "board", "plus": [["box", 12, 20, -14.0, -6.0, 14.6, 17]], "minus": [], "xray": false}, {"name": "Custom carrier board (84x58)", "color": "green", "group": "board", "plus": [["box", -29, 29, -42, 42, 13, 14.6]], "minus": [], "xray": false}, {"name": "Compute Module 5 (55x40)", "color": "green", "group": "board", "plus": [["box", -27.5, 27.5, 0, 40, 16.1, 17.3]], "minus": [], "xray": false}, {"name": "CM5 heatsink", "color": "silver", "group": "board", "plus": [["box", -20, 20, 5, 35, 17.3, 24]], "minus": [], "xray": false}, {"name": "CM5 board-to-board connectors", "color": "black", "group": "board", "plus": [["box", -25, 25, 3, 37, 14.6, 16.1]], "minus": [], "xray": false}, {"name": "M.2 socket (underside)", "color": "black", "group": "board", "plus": [["box", -11, 11, 36, 42, 9, 13]], "minus": [], "xray": false}, {"name": "UGen300 M.2 card (2280, underside)", "color": "pcb", "group": "ai", "plus": [["box", -11, 11, -40, 40, 10.5, 11.3]], "minus": [], "xray": false}, {"name": "Hailo-10H (faces down)", "color": "black", "group": "ai", "plus": [["box", -8, 8, -10, 7, 9.3, 10.5]], "minus": [], "xray": false}, {"name": "Buck + bus-servo driver", "color": "blue", "group": "board", "plus": [["box", -27, -8, -24, -8, 14.6, 19]], "minus": [], "xray": false}, {"name": "RJ45 (PoE)", "color": "silver", "group": "board", "plus": [["box", -22, -6, -41, -25, 14.6, 28]], "minus": [], "xray": false}, {"name": "25 mm blower (exhausts right)", "color": "black", "group": "cool", "plus": [["box", 8, 31, -43, -20, 19, 31]], "minus": [], "xray": false}, {"name": "Pan servo STS3032", "color": "black", "group": "head", "plus": [["box", -6.05, 6.05, -19.299999999999997, 3.9000000000000004, 24.0, 49.0], ["cyl", [0, -2.0, 49.0], [0, -2.0, 52.5], 3.0], ["box", -6.05, 6.05, -23.849999999999998, 8.45, 42.0, 44.5]], "minus": [], "xray": false}, {"name": "Pan horn", "color": "silver", "group": "head", "plus": [["cyl", [0, -2.0, 52.5], [0, -2.0, 54.5], 10]], "minus": [], "xray": false}, {"name": "Pedestal (fixed)", "color": "white", "group": "head", "plus": [["cyl", [0, -2.0, 36.0], [0, -2.0, 42.0], 25]], "minus": [["cyl", [0, -2.0, 35.0], [0, -2.0, 39.5], 23], ["box", -6.35, 6.35, -19.499999999999996, 4.1000000000000005, 35.0, 43.0], ["box", 13, 17, -11.0, -3.0, 35.0, 43.0]], "xray": true}, {"name": "PTFE washer", "color": "white", "group": "head", "plus": [["cyl", [0, -2.0, 42.0], [0, -2.0, 43.0], 25]], "minus": [["cyl", [0, -2.0, 41.0], [0, -2.0, 44.0], 21.5]], "xray": false}, {"name": "Turret (rotates)", "color": "white", "group": "head", "plus": [["cyl", [0, -2.0, 43.0], [0, -2.0, 56.5], 25]], "minus": [["cyl", [0, -2.0, 42.0], [0, -2.0, 54.5], 23]], "xray": true}, {"name": "U bracket", "color": "white", "group": "head", "plus": [["rbox", -31.6, 31.6, -13.0, 9.0, 56.5, 59.5, 4], ["box", -31.6, -28.6, -13.0, 9.0, 59.5, 84.5], ["cyl", [-31.6, -2.0, 84.5], [-28.6, -2.0, 84.5], 11], ["box", 28.6, 31.6, -13.0, 9.0, 59.5, 84.5], ["cyl", [28.6, -2.0, 84.5], [31.6, -2.0, 84.5], 11]], "minus": [["cyl", [-29.4, -2.0, 84.5], [-28.4, -2.0, 84.5], 9.8], ["cyl", [28.4, -2.0, 84.5], [31.8, -2.0, 84.5], 8.5]], "xray": true}, {"name": "Tilt horn (bolted to the left cheek)", "color": "silver", "group": "head", "plus": [["cyl", [-29.4, -2.0, 84.5], [-28.2, -2.0, 84.5], 9.5]], "minus": [], "xray": false}, {"name": "Horn screws", "color": "black", "group": "head", "plus": [["cyl", [-31.95, -8.5, 84.5], [-31.6, -8.5, 84.5], 1.5], ["cyl", [-31.95, 4.5, 84.5], [-31.6, 4.5, 84.5], 1.5]], "minus": [], "xray": false}, {"name": "Right pivot bearing", "color": "silver", "group": "head", "plus": [["cyl", [28.4, -2.0, 84.5], [31.8, -2.0, 84.5], 8.5]], "minus": [["cyl", [28.0, -2.0, 84.5], [32.2, -2.0, 84.5], 6.0]], "xray": false}, {"name": "Hollow pivot shaft", "color": "silver", "group": "head", "plus": [["cyl", [27.0, -2.0, 84.5], [32.2, -2.0, 84.5], 6.0]], "minus": [["cyl", [26.0, -2.0, 84.5], [33.0, -2.0, 84.5], 3.0]], "xray": false}, {"name": "Camera barrel (tilts)", "color": "white", "group": "head", "plus": [["cyl", [-28, -2.0, 84.5], [28, -2.0, 84.5], 21]], "minus": [], "xray": true}, {"name": "Tilt servo STS3032 (inside the barrel)", "color": "black", "group": "head", "plus": [["box", -27.5, 0, -19.299999999999997, 3.9000000000000004, 78.45, 90.55], ["cyl", [-29.0, -2.0, 84.5], [-27.5, -2.0, 84.5], 3.0]], "minus": [], "xray": false}, {"name": "Camera Module 3", "color": "green", "group": "head", "plus": [["box", -12.5, 12.5, 5.0, 6.0, 72.5, 96.5], ["box", -4.25, 4.25, 6.0, 16.0, 80.25, 88.75]], "minus": [], "xray": false}, {"name": "Lens bezel", "color": "black", "group": "head", "plus": [["cyl", [0, 16.0, 84.5], [0, 20.5, 84.5], 8]], "minus": [], "xray": false}, {"name": "Light ring", "color": "white", "group": "head", "plus": [["cyl", [0, 16.0, 84.5], [0, 20.0, 84.5], 9.4]], "minus": [["cyl", [0, 15.0, 84.5], [0, 21.0, 84.5], 8.0]], "xray": false}, {"name": "Camera lens", "color": "glass", "group": "head", "plus": [["cyl", [0, 20.5, 84.5], [0, 21.0, 84.5], 5.5]], "minus": [], "xray": false}]}, "vc": {"meta": {"HW": 34.0, "FR": 46.0, "RE": -46.0, "H": 36.0, "W": 3.0, "pan_f": -2.0, "name": "\u5438\u9802\u7248 \u00b7 \u5be6\u969b\u90e8\u7f72", "u_ref": 110.0}, "parts": [{"name": "Base shell", "color": "white", "group": "shell", "plus": [["rbox", -34.0, 34.0, -46.0, 46.0, 77.0, 110.0, 6]], "minus": [["box", -31.0, 31.0, -43.0, 43.0, 73.0, 107.0], ["box", -18, 18, -32, -28, 106.0, 111.0], ["box", -18, 18, -20, -16, 106.0, 111.0], ["box", -18, 18, -8, -4, 106.0, 111.0], ["box", -18, 18, 4, 8, 106.0, 111.0], ["box", -18, 18, 16, 20, 106.0, 111.0], ["box", -18, 18, 28, 32, 106.0, 111.0], ["box", -35.0, -30.0, -39, -22, 80.2, 81.4], ["box", -35.0, -30.0, -39, -22, 78.0, 79.2], ["cyl", [8, -40, 111.0], [8, -40, 106.0], 3.2], ["box", 5, 11, -47.0, -40, 108.8, 111.0]], "xray": false}, {"name": "Lid", "color": "white", "group": "lid", "plus": [["rbox", -34.0, 34.0, -46.0, 46.0, 74.0, 77.0, 6]], "minus": [["box", -7, 7, -20.299999999999997, 4.9, 73.0, 78.0], ["box", -17, -13, -11.0, -3.0, 73.0, 78.0]], "xray": false}, {"name": "Carrier standoff", "color": "brass", "group": "board", "plus": [["cyl", [26, -38, 107.0], [26, -38, 97.0], 2.5]], "minus": [], "xray": false}, {"name": "Carrier standoff", "color": "brass", "group": "board", "plus": [["cyl", [26, 38, 107.0], [26, 38, 97.0], 2.5]], "minus": [], "xray": false}, {"name": "Carrier standoff", "color": "brass", "group": "board", "plus": [["cyl", [-26, -38, 107.0], [-26, -38, 97.0], 2.5]], "minus": [], "xray": false}, {"name": "Carrier standoff", "color": "brass", "group": "board", "plus": [["cyl", [-26, 38, 107.0], [-26, 38, 97.0], 2.5]], "minus": [], "xray": false}, {"name": "Camera CSI connector", "color": "black", "group": "board", "plus": [["box", -20, -12, -14.0, -6.0, 93.0, 95.4]], "minus": [], "xray": false}, {"name": "Custom carrier board (84x58)", "color": "green", "group": "board", "plus": [["box", -29, 29, -42, 42, 95.4, 97.0]], "minus": [], "xray": false}, {"name": "Compute Module 5 (55x40)", "color": "green", "group": "board", "plus": [["box", -27.5, 27.5, 0, 40, 92.7, 93.9]], "minus": [], "xray": false}, {"name": "CM5 heatsink", "color": "silver", "group": "board", "plus": [["box", -20, 20, 5, 35, 86.0, 92.7]], "minus": [], "xray": false}, {"name": "CM5 board-to-board connectors", "color": "black", "group": "board", "plus": [["box", -25, 25, 3, 37, 93.9, 95.4]], "minus": [], "xray": false}, {"name": "M.2 socket (underside)", "color": "black", "group": "board", "plus": [["box", -11, 11, 36, 42, 97.0, 101.0]], "minus": [], "xray": false}, {"name": "UGen300 M.2 card (2280, underside)", "color": "pcb", "group": "ai", "plus": [["box", -11, 11, -40, 40, 98.7, 99.5]], "minus": [], "xray": false}, {"name": "Hailo-10H (faces down)", "color": "black", "group": "ai", "plus": [["box", -8, 8, -10, 7, 99.5, 100.7]], "minus": [], "xray": false}, {"name": "Buck + bus-servo driver", "color": "blue", "group": "board", "plus": [["box", 8, 27, -24, -8, 91.0, 95.4]], "minus": [], "xray": false}, {"name": "RJ45 (PoE)", "color": "silver", "group": "board", "plus": [["box", 6, 22, -41, -25, 82.0, 95.4]], "minus": [], "xray": false}, {"name": "25 mm blower (exhausts right)", "color": "black", "group": "cool", "plus": [["box", -31, -8, -43, -20, 79.0, 91.0]], "minus": [], "xray": false}, {"name": "Pan servo STS3032", "color": "black", "group": "head", "plus": [["box", -6.05, 6.05, -19.299999999999997, 3.9000000000000004, 61.0, 86.0], ["cyl", [0, -2.0, 61.0], [0, -2.0, 57.5], 3.0], ["box", -6.05, 6.05, -23.849999999999998, 8.45, 65.5, 68.0]], "minus": [], "xray": false}, {"name": "Pan horn", "color": "silver", "group": "head", "plus": [["cyl", [0, -2.0, 57.5], [0, -2.0, 55.5], 10]], "minus": [], "xray": false}, {"name": "Pedestal (fixed)", "color": "white", "group": "head", "plus": [["cyl", [0, -2.0, 74.0], [0, -2.0, 68.0], 25]], "minus": [["cyl", [0, -2.0, 75.0], [0, -2.0, 70.5], 23], ["box", -6.35, 6.35, -19.499999999999996, 4.1000000000000005, 67.0, 75.0], ["box", -17, -13, -11.0, -3.0, 67.0, 75.0]], "xray": true}, {"name": "PTFE washer", "color": "white", "group": "head", "plus": [["cyl", [0, -2.0, 68.0], [0, -2.0, 67.0], 25]], "minus": [["cyl", [0, -2.0, 69.0], [0, -2.0, 66.0], 21.5]], "xray": false}, {"name": "Turret (rotates)", "color": "white", "group": "head", "plus": [["cyl", [0, -2.0, 67.0], [0, -2.0, 53.5], 25]], "minus": [["cyl", [0, -2.0, 68.0], [0, -2.0, 55.5], 23]], "xray": true}, {"name": "U bracket", "color": "white", "group": "head", "plus": [["rbox", -31.6, 31.6, -13.0, 9.0, 50.5, 53.5, 4], ["box", 28.6, 31.6, -13.0, 9.0, 25.5, 50.5], ["cyl", [31.6, -2.0, 25.5], [28.6, -2.0, 25.5], 11], ["box", -31.6, -28.6, -13.0, 9.0, 25.5, 50.5], ["cyl", [-28.6, -2.0, 25.5], [-31.6, -2.0, 25.5], 11]], "minus": [["cyl", [29.4, -2.0, 25.5], [28.4, -2.0, 25.5], 9.8], ["cyl", [-28.4, -2.0, 25.5], [-31.8, -2.0, 25.5], 8.5]], "xray": true}, {"name": "Tilt horn (bolted to the left cheek)", "color": "silver", "group": "head", "plus": [["cyl", [29.4, -2.0, 25.5], [28.2, -2.0, 25.5], 9.5]], "minus": [], "xray": false}, {"name": "Horn screws", "color": "black", "group": "head", "plus": [["cyl", [31.95, -8.5, 25.5], [31.6, -8.5, 25.5], 1.5], ["cyl", [31.95, 4.5, 25.5], [31.6, 4.5, 25.5], 1.5]], "minus": [], "xray": false}, {"name": "Right pivot bearing", "color": "silver", "group": "head", "plus": [["cyl", [-28.4, -2.0, 25.5], [-31.8, -2.0, 25.5], 8.5]], "minus": [["cyl", [-28.0, -2.0, 25.5], [-32.2, -2.0, 25.5], 6.0]], "xray": false}, {"name": "Hollow pivot shaft", "color": "silver", "group": "head", "plus": [["cyl", [-27.0, -2.0, 25.5], [-32.2, -2.0, 25.5], 6.0]], "minus": [["cyl", [-26.0, -2.0, 25.5], [-33.0, -2.0, 25.5], 3.0]], "xray": false}, {"name": "Camera barrel (tilts)", "color": "white", "group": "head", "plus": [["cyl", [28, -2.0, 25.5], [-28, -2.0, 25.5], 21]], "minus": [], "xray": true}, {"name": "Tilt servo STS3032 (inside the barrel)", "color": "black", "group": "head", "plus": [["box", 0, 27.5, -19.299999999999997, 3.9000000000000004, 19.450000000000003, 31.549999999999997], ["cyl", [29.0, -2.0, 25.5], [27.5, -2.0, 25.5], 3.0]], "minus": [], "xray": false}, {"name": "Camera Module 3", "color": "green", "group": "head", "plus": [["box", -12.5, 12.5, 5.0, 6.0, 13.5, 37.5], ["box", -4.25, 4.25, 6.0, 16.0, 21.25, 29.75]], "minus": [], "xray": false}, {"name": "Lens bezel", "color": "black", "group": "head", "plus": [["cyl", [0, 12.744736797201853, 15.175624145681171], [0, 16.430920996502316, 12.594530182101463], 8]], "minus": [], "xray": false}, {"name": "Light ring", "color": "white", "group": "head", "plus": [["cyl", [0, 12.744736797201853, 15.175624145681171], [0, 16.02134497435782, 12.881318400276987], 9.4]], "minus": [["cyl", [0, 11.92558475291286, 15.749200582032216], [0, 16.84049701864681, 12.307741963925942], 8.0]], "xray": false}, {"name": "Camera lens", "color": "glass", "group": "head", "plus": [["cyl", [0, 16.430920996502316, 12.594530182101463], [0, 16.84049701864681, 12.307741963925942], 5.5]], "minus": [], "xray": false}, {"name": "Plate post", "color": "white", "group": "mount", "plus": [["cyl", [26, -38, 114.0], [26, -38, 110.0], 4]], "minus": [], "xray": false}, {"name": "Plate post", "color": "white", "group": "mount", "plus": [["cyl", [26, 38, 114.0], [26, 38, 110.0], 4]], "minus": [], "xray": false}, {"name": "Plate post", "color": "white", "group": "mount", "plus": [["cyl", [-26, -38, 114.0], [-26, -38, 110.0], 4]], "minus": [], "xray": false}, {"name": "Plate post", "color": "white", "group": "mount", "plus": [["cyl", [-26, 38, 114.0], [-26, 38, 110.0], 4]], "minus": [], "xray": false}, {"name": "Ceiling plate (twist-lock)", "color": "white", "group": "mount", "plus": [["cyl", [0, -2.0, 119.0], [0, -2.0, 114.0], 62]], "minus": [["cyl", [8, -40, 120.0], [8, -40, 109.0], 6.5]], "xray": false}, {"name": "Ceiling", "color": "ceiling", "group": "room", "plus": [["box", -150, 150, -130, 130, 119.0, 131.0]], "minus": [], "xray": false}]}}""")
OFFSET = {'v1': 0.0, 'v2': 150.0, 'v1x': -175.0, 'vc': 420.0, 'p5': 285.0, 'p5x': -350.0}   # r offset of each build in the scene
EXPLODE = {'lid': (0, 0, 120), 'head': (0, 0, 120), 'servo': (0, 0, 120),
           'hat': (0, 0, 40), 'ai': (0, 0, 68), 'cool': (40, 0, 0), 'power': (-45, 0, 0)}
XRAY_GROUPS = ('shell', 'lid', 'boss')
PALETTE = {
    'white': (236, 236, 232), 'black': (28, 28, 30), 'silver': (188, 191, 196), 'green': (24, 118, 66),
    'pcb': (30, 34, 40), 'brass': (196, 160, 70), 'amber': (215, 150, 50), 'blue': (40, 90, 170),
    'glass': (40, 110, 150), 'red': (176, 74, 56), 'ceiling': (222, 223, 220),
}
log_lines = []


def log(msg):
    log_lines.append(str(msg))


def build():
    app = adsk.core.Application.get()
    app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
    design = adsk.fusion.Design.cast(app.activeProduct)
    design.designType = adsk.fusion.DesignTypes.DirectDesignType
    root = design.rootComponent
    tbm = adsk.fusion.TemporaryBRepManager.get()
    BT = adsk.fusion.BooleanTypes

    z_up = True
    try:
        pref = app.preferences.generalPreferences.defaultModelingOrientation
        z_up = (pref == adsk.core.DefaultModelingOrientations.ZUpModelingOrientation)
    except Exception:
        pass
    log('z_up=%s' % z_up)
    S = 0.1  # mm -> cm
    k = 1 / math.sqrt(2)

    def P(r, f, u):
        return adsk.core.Point3D.create(r * S, -f * S, u * S) if z_up else adsk.core.Point3D.create(r * S, u * S, f * S)

    def V(r, f, u):
        return adsk.core.Vector3D.create(r, -f, u) if z_up else adsk.core.Vector3D.create(r, u, f)

    def bx(r0, r1, f0, f1, u0, u1):
        c = ((r0 + r1) / 2.0, (f0 + f1) / 2.0, (u0 + u1) / 2.0)
        obb = adsk.core.OrientedBoundingBox3D.create(
            P(*c), V(1, 0, 0), V(0, 1, 0), abs(r1 - r0) * S, abs(f1 - f0) * S, abs(u1 - u0) * S)
        return tbm.createBox(obb)

    def cyl(p1, p2, rad):
        return tbm.createCylinderOrCone(P(*p1), rad * S, P(*p2), rad * S)

    def union(a, b):
        tbm.booleanOperation(a, b, BT.UnionBooleanType)

    def cut(a, b):
        tbm.booleanOperation(a, b, BT.DifferenceBooleanType)

    def rbox(r0, r1, f0, f1, u0, u1, R):
        b = bx(r0 + R, r1 - R, f0, f1, u0, u1)
        union(b, bx(r0, r1, f0 + R, f1 - R, u0, u1))
        for rr in (r0 + R, r1 - R):
            for ff in (f0 + R, f1 - R):
                union(b, cyl((rr, ff, u0), (rr, ff, u1), R))
        return b

    def diamond(c, a1, a2, size, thick=8):
        obb = adsk.core.OrientedBoundingBox3D.create(P(*c), V(*a1), V(*a2), size * S, size * S, thick * S)
        return tbm.createBox(obb)

    def prim(p, d):
        dr, df, du = d
        kind = p[0]
        if kind == 'box':
            r0, r1, f0, f1, u0, u1 = p[1:7]
            return bx(r0 + dr, r1 + dr, f0 + df, f1 + df, u0 + du, u1 + du)
        if kind == 'rbox':
            r0, r1, f0, f1, u0, u1, R = p[1:8]
            return rbox(r0 + dr, r1 + dr, f0 + df, f1 + df, u0 + du, u1 + du, R)
        if kind == 'cyl':
            (r1, f1, u1), (r2, f2, u2), rad = p[1], p[2], p[3]
            return cyl((r1 + dr, f1 + df, u1 + du), (r2 + dr, f2 + df, u2 + du), rad)
        if kind == 'dside':      # diamond vent through a side wall (normal along r)
            rw, f, u, size = p[1:5]
            return diamond((rw + dr, f + df, u + du), (0, k, k), (0, -k, k), size)
        if kind == 'dfront':     # through a front / rear wall (normal along f)
            fw, r, u, size = p[1:5]
            return diamond((r + dr, fw + df, u + du), (k, 0, k), (-k, 0, k), size)
        if kind == 'dtop':       # through the lid (normal along u)
            uw, r, f, size = p[1:5]
            return diamond((r + dr, f + df, uw + du), (k, k, 0), (-k, k, 0), size)
        raise ValueError(kind)

    bodies = {}          # build -> [(body, part dict)]
    by_colour = {}

    def make(key, src, explode):
        meta = DATA[src]['meta']
        comp = None
        try:
            occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
            comp = occ.component
            comp.name = {'v1': 'PatrolEye v1 (competition)', 'v2': 'PatrolEye v2 (compact)',
                         'v1x': 'PatrolEye v1 exploded', 'vc': 'PatrolEye ceiling (deployment)',
                         'p5': 'PatrolEye p5 (Stage II, Pi 5 base)', 'p5x': 'PatrolEye p5 exploded'}[key]
        except Exception:
            log('component %s: using root\n%s' % (key, traceback.format_exc()))
        target = comp or root
        out = []
        for part in DATA[src]['parts']:
            g = part['group']
            d = [OFFSET[key], 0.0, 0.0]
            if explode:
                if g == 'cable':
                    continue
                e = EXPLODE.get(g, (0, 0, 0))
                d = [d[0] + e[0], d[1] + e[1], d[2] + e[2]]
            try:
                body = None
                for p in part['plus']:
                    b = prim(p, d)
                    if body is None:
                        body = b
                    else:
                        union(body, b)
                for p in part['minus']:
                    cut(body, prim(p, d))
                try:
                    bb = target.bRepBodies.add(body)
                except Exception:
                    bb = root.bRepBodies.add(body)
                bb.name = part['name']
                out.append((bb, part))
                by_colour.setdefault(part['color'], []).append(bb)
            except Exception:
                log('part %s / %s FAILED\n%s' % (key, part['name'], traceback.format_exc()))
        bodies[key] = out
        log('%s: %d bodies (%s)' % (key, len(out), meta.get('name', '')))

    make('v1', 'v1', False)
    make('v2', 'v2', False)
    make('v1x', 'v1', True)
    make('vc', 'vc', False)
    make('p5', 'p5', False)
    make('p5x', 'p5', True)

    # ------------------------------------------------------------------ colours
    try:
        lib = None
        for nm in ('Fusion Appearance Library', 'Fusion 360 Appearance Library'):
            lib = app.materialLibraries.itemByName(nm)
            if lib:
                break
        base = lib.appearances.itemByName('Plastic - Matte (Black)')
        for key, rgb in PALETTE.items():
            if key not in by_colour:
                continue
            nm = 'Concept ' + key
            ap = design.appearances.itemByName(nm) or design.appearances.addByCopy(base, nm)
            prop = adsk.core.ColorProperty.cast(ap.appearanceProperties.itemByName('Color'))
            if prop:
                prop.value = adsk.core.Color.create(rgb[0], rgb[1], rgb[2], 255)
            for b in by_colour[key]:
                b.appearance = ap
        log('appearances ok')
    except Exception:
        log('appearance step FAILED\n' + traceback.format_exc())

    # ------------------------------------------------------------------ views
    def show(keys, hide=()):
        for kk, lst in bodies.items():
            for b, part in lst:
                try:
                    b.isLightBulbOn = kk in keys and part['group'] not in hide
                except Exception:
                    pass

    def xray(on, keys=('v1', 'v2', 'v1x', 'vc', 'p5', 'p5x')):
        for kk in keys:
            for b, part in bodies.get(kk, []):
                if part['group'] in XRAY_GROUPS or part.get('xray'):
                    try:
                        b.opacity = 0.16 if on else 1.0
                    except Exception:
                        pass

    def save(name, w=2000, h=1600):
        path = os.path.join(OUT_DIR, name)
        vp = app.activeViewport
        try:
            opt = adsk.core.SaveImageFileOptions.create(path)
            opt.width, opt.height = w, h
            opt.isBackgroundTransparent = True
            opt.isAntiAliased = True
            return vp.saveAsImageFileWithOptions(opt)
        except Exception:
            return vp.saveAsImageFile(path, w, h)

    def shot(name, keys, d, xr=False, hide=()):
        try:
            show(keys, hide)
            xray(xr)
            vp = app.activeViewport
            c = vp.camera
            c.isSmoothTransition = False
            tgt = P(0, 0, 60)
            dv = V(*d)
            dv.normalize()
            dv.scaleBy(80.0)
            c.target = tgt
            c.eye = adsk.core.Point3D.create(tgt.x + dv.x, tgt.y + dv.y, tgt.z + dv.z)
            c.upVector = V(0, 0, 1)
            c.isFitView = True
            vp.camera = c
            adsk.doEvents()
            vp.fit()
            adsk.doEvents()
            vp.refresh()
            adsk.doEvents()
            log('%s: %s' % (name, save(name)))
        except Exception:
            log('%s FAILED\n%s' % (name, traceback.format_exc()))

    FRONT = (1.0, 1.35, 0.55)
    REAR = (-1.0, -1.25, 0.6)
    shot('v3_v1_front.png', ['v1'], FRONT)
    shot('v3_v1_rear.png', ['v1'], REAR)
    shot('v3_v1_xray_left.png', ['v1'], (-1.0, 0.35, 0.5), xr=True)
    shot('v3_v1_xray_rear.png', ['v1'], (-0.8, -1.2, 0.8), xr=True)
    shot('v3_v1_exploded.png', ['v1x'], (1.0, 1.2, 0.6))
    shot('v3_v2_front.png', ['v2'], FRONT)
    shot('v3_v2_xray.png', ['v2'], (-1.0, 0.6, 0.6), xr=True)
    shot('v3_v2_rear.png', ['v2'], REAR)
    shot('v3_v1_v2_front.png', ['v1', 'v2'], (0.45, 1.3, 0.4))
    shot('v3_v1_base_xray.png', ['v1'], (1.0, 1.1, 1.0), xr=True, hide=('head', 'lid'))
    shot('v3_v2_base_xray.png', ['v2'], (1.0, 1.1, 1.0), xr=True, hide=('head', 'lid'))
    # ceiling version: seen from below, as from the room
    shot('v3_vc_front.png', ['vc'], (1.0, 1.35, -0.5), hide=('room',))
    shot('v3_vc_room.png', ['vc'], (0.85, 1.5, -0.38))
    shot('v3_vc_side.png', ['vc'], (1.0, 0.0, -0.12), hide=('room',))
    shot('v3_vc_xray.png', ['vc'], (1.0, 1.1, -0.9), xr=True, hide=('room',))
    # Stage II build (Pi 5 base + compact head)
    shot('v3_p5_front.png', ['p5'], FRONT)
    shot('v3_p5_rear.png', ['p5'], REAR)
    shot('v3_p5_xray.png', ['p5'], (-1.0, 0.6, 0.6), xr=True)
    shot('v3_p5_exploded.png', ['p5x'], (1.0, 1.2, 0.6))
    shot('v3_p5_base_xray.png', ['p5'], (1.0, 1.1, 1.0), xr=True, hide=('head', 'lid'))
    shot('v3_v1_p5_front.png', ['v1', 'p5'], (0.45, 1.3, 0.4))
    show(['v1', 'v2', 'v1x', 'vc', 'p5', 'p5x'])
    xray(False)
    try:
        app.activeViewport.fit()
    except Exception:
        pass
    log('bodies total=%d' % sum(len(v) for v in bodies.values()))
    log('DONE')


try:
    build()
except Exception:
    log('BUILD FAILED\n' + traceback.format_exc())
finally:
    try:
        os.makedirs(OUT_DIR, exist_ok=True)
        with open(LOG, 'w') as fh:
            fh.write('\n'.join(log_lines) + '\n')
    except Exception:
        pass

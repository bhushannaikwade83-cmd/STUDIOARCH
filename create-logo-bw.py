from PIL import Image
import os

public_dir = 'public'
logo_color_path = os.path.join(public_dir, 'logo-color.png')
logo_bw_path = os.path.join(public_dir, 'logo-bw.png')

if os.path.exists(logo_color_path):
    img = Image.open(logo_color_path)
    img_bw = img.convert('L')
    img_bw.save(logo_bw_path)
    print('SUCCESS: Created logo-bw.png')
else:
    print('ERROR: logo-color.png not found')

#!/usr/bin/env python3
"""
Setup script to create B&W and color versions of the logo
Run this once: python setup-logos.py
"""

import os
import sys
from PIL import Image
import shutil

def setup_logos():
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    logo_path = os.path.join(public_dir, 'logo.png')
    logo_color_path = os.path.join(public_dir, 'logo-color.png')
    logo_bw_path = os.path.join(public_dir, 'logo-bw.png')

    print('Setting up logos...')

    # Check for either logo.png or logo-color.png as source
    source_logo = None
    if os.path.exists(logo_path):
        source_logo = logo_path
    elif os.path.exists(logo_color_path):
        source_logo = logo_color_path
    else:
        print('ERROR: Neither logo.png nor logo-color.png found in public folder')
        sys.exit(1)

    try:
        # Create color version if it doesn't exist
        if not os.path.exists(logo_color_path) and source_logo == logo_path:
            shutil.copy(logo_path, logo_color_path)
            print('Created logo-color.png')

        # Create B&W version
        if os.path.exists(logo_bw_path):
            os.remove(logo_bw_path)

        img = Image.open(source_logo)
        img_bw = img.convert('L')
        img_bw.save(logo_bw_path)
        print('Created logo-bw.png')
        print('SUCCESS: Logos setup complete!')

    except Exception as err:
        print(f'ERROR: {err}')
        sys.exit(1)

if __name__ == '__main__':
    setup_logos()

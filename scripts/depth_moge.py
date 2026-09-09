#!/usr/bin/env python3
"""Generate the parallax depth map for the profile photo with MoGe.

Usage:
  python scripts/depth_moge.py --version v3 --model Ruicheng/moge-3-vitl \
      --image assets/img/prof_pic.jpg --out assets/img/prof_pic_depth.png

MoGe-3 needs a CUDA Linux box (FlexGEMM/Triton). MoGe-2 also runs on CPU/macOS.
Output convention (consumed by assets/js/fx.js): 8-bit greyscale, near = white,
normalised over the valid mask, invalid/sky = 0, then lightly feathered.
"""
import argparse, importlib, sys
import numpy as np, torch
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("--version", default="v3", choices=["v1", "v2", "v3"])
ap.add_argument("--model", default="Ruicheng/moge-3-vitl")
ap.add_argument("--image", default="assets/img/prof_pic.jpg")
ap.add_argument("--out", default="assets/img/prof_pic_depth.png")
ap.add_argument("--blur", type=float, default=2.0, help="Gaussian feather radius in px (MoGe edges are sharp; keep small)")
ap.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
args = ap.parse_args()

MoGeModel = importlib.import_module(f"moge.model.{args.version}").MoGeModel
device = torch.device(args.device)
model = MoGeModel.from_pretrained(args.model).to(device).eval()

img = Image.open(args.image).convert("RGB")
x = torch.tensor(np.asarray(img) / 255.0, dtype=torch.float32, device=device).permute(2, 0, 1)
with torch.no_grad():
    out = model.infer(x, use_fp16=(device.type == "cuda"))  # fp16 kernels only on GPU

depth = out["depth"].float().cpu().numpy()
mask = out["mask"].cpu().numpy().astype(bool) if "mask" in out else np.isfinite(depth)
mask &= np.isfinite(depth) & (depth > 0)
print(f"depth range (valid): {depth[mask].min():.3f} .. {depth[mask].max():.3f}, valid {mask.mean():.1%}")

inv = np.zeros_like(depth)
inv[mask] = 1.0 / depth[mask]
lo, hi = np.percentile(inv[mask], 1), np.percentile(inv[mask], 99)
d = np.clip((inv - lo) / (hi - lo), 0, 1)
d[~mask] = 0.0  # sky / invalid -> farthest

im = Image.fromarray((d * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)
if args.blur > 0:
    im = im.filter(ImageFilter.GaussianBlur(radius=args.blur))
im.save(args.out, optimize=True)
print("saved", args.out, im.size)

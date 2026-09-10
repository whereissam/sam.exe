"""Render exported GLBs together to check orientation, materials, and silhouettes."""
import json
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
catalog = json.loads((ROOT / 'components/world/model-manifest.json').read_text())
for index, (name, url) in enumerate(catalog.items()):
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public' / url.lstrip('/')))
    offset = Vector(((index % 3 - 1) * 3.6, (index // 3) * 4, 0))
    for obj in bpy.context.selected_objects:
        if obj.parent is None:
            obj.location += offset
bpy.ops.mesh.primitive_plane_add(size=200)
floor = bpy.context.object
mat = bpy.data.materials.new('Backdrop')
mat.diffuse_color = (.12,.09,.16,1)
floor.data.materials.append(mat)
floor.location.z = -.025
bpy.ops.object.camera_add(location=(10,-15,13))
camera = bpy.context.object
camera.rotation_euler = (Vector((0,2,1.1)) - camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 13.5
bpy.context.scene.camera = camera
for loc, energy, size in [((0,-5,10),1800,8),((-7,3,6),1200,7),((5,7,8),1600,6)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (Vector((0,2,1))-light.location).to_track_quat('-Z','Y').to_euler()
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.world.color = (.2,.2,.2)
scene.render.resolution_x = 1400
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(ROOT / 'assets/blender/kit-preview.png')
bpy.ops.render.render(write_still=True)

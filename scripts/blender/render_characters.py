"""Re-import the shipped skins and inspect neutral, raised-arm and seated poses."""
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
manifest = json.loads((ROOT/'components/world/character-manifest.json').read_text())
for col, pose in enumerate(['neutral', 'stretch', 'seated']):
    for index, (name, url) in enumerate(manifest.items()):
        bpy.ops.import_scene.gltf(filepath=str(ROOT/'public'/url.lstrip('/')))
        imported = list(bpy.context.selected_objects)
        rig = next(obj for obj in imported if obj.type == 'ARMATURE')
        if pose == 'stretch':
            for side, angle in [('L', -2.75), ('R', 2.75)]:
                bone = rig.pose.bones['Arm'+side]
                bone.rotation_mode = 'XYZ'; bone.rotation_euler.z = angle
        elif pose == 'seated':
            for side in ['L', 'R']:
                for joint, angle in [('Leg', -math.pi/2), ('Knee', math.pi/2), ('Arm', -.72)]:
                    bone = rig.pose.bones[joint+side]
                    bone.rotation_mode = 'XYZ'; bone.rotation_euler.x = angle
        for obj in imported:
            if obj.parent is None: obj.location.x += col*2.7 + index*1.15 - 3.25
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.03))
floor = bpy.context.object
mat = bpy.data.materials.new('Warm backdrop'); mat.diffuse_color = (.65,.60,.49,1)
floor.data.materials.append(mat)
bpy.ops.object.camera_add(location=(3,-12,5.6))
camera = bpy.context.object
camera.rotation_euler = (Vector((0,0,1.05))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'; camera.data.ortho_scale = 9.2
scene = bpy.context.scene; scene.camera = camera
for loc, power, size in [((-3,-4,7),1100,7),((4,1,5),850,5)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.world.color=(.3,.3,.3)
scene.render.resolution_x=1600; scene.render.resolution_y=650; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ROOT/'assets/blender/character-rig-preview.png')
bpy.ops.render.render(write_still=True)

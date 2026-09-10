"""Create editable couple, web GLB, and a seaside portrait. No photo texture."""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from couple import create_couple

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/blender'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
root, characters = create_couple()
bpy.ops.object.select_all(action='DESELECT')
for obj in characters:
    obj.select_set(True)
bpy.context.view_layer.objects.active = characters[0]
# Keep separate editable parts in the blend; merge an export-only copy.
bpy.ops.object.duplicate()
bpy.ops.object.join()
web_mesh = bpy.context.object
web_mesh.name = 'Travel companions'
bpy.ops.export_scene.gltf(filepath=str(OUT/'sam-travel-couple.glb'), export_format='GLB', use_selection=True)
bpy.ops.object.delete(use_global=False)

def finish(name, color):
    obj = bpy.context.object
    obj.name = name
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*[v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in color], 1)
    mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = mat.diffuse_color
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .8
    obj.data.materials.append(mat)
    return obj

def disc(name, p, radius, depth, color, vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=p)
    return finish(name, color)

disc('Ocean diorama', (0, .7, -.25), 2.85, .35, (.25,.58,.64))
disc('Pebble beach', (0, -.45, -.10), 1.95, .18, (.73,.64,.53), 12)
for i in range(22):
    angle = i*2.399
    radius = 1.1+(i%4)*.19
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.12, location=(math.cos(angle)*radius, -.45+math.sin(angle)*radius, .02))
    bpy.context.object.scale = (1,.8,.5)
    finish('Beach pebble', (.56+i%3*.08,.51+i%3*.07,.49+i%3*.06))
for i in range(7):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.6+i*.53,1.65+(i%2)*.28,-.055))
    bpy.context.object.dimensions=(.35,.035,.012)
    finish('Little sea glimmer', (.71,.85,.81))
disc('Sunset disc', (0,2.55,2.3), .89, .07, (1,.59,.30)).rotation_euler=(math.pi/2,0,0)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.45))
finish('Warm studio backdrop', (.20,.16,.24))
bpy.ops.object.camera_add(location=(3,-8,4.1))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,.35,1.05))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=6.7
scene=bpy.context.scene;scene.camera=camera
scene.world.color=(.3,.3,.3)
for loc,power,color,size in [((-3,-4,7),650,(1,.80,.67),5),((4,0,5),500,(.74,.73,1),4),((0,4,5),800,(1,.63,.37),3)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light=bpy.context.object;light.data.energy=power;light.data.color=color;light.data.shape='DISK';light.data.size=size
    light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=1500;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'sam-travel-couple.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sam-travel-couple.blend'))
bpy.ops.render.render(write_still=True)

# A close-up makes facial and pose review possible without zooming a full poster.
camera.location=(.8,-7,3.0)
camera.rotation_euler=(Vector((0,0,1.60))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=2.5
scene.render.resolution_x=1300;scene.render.resolution_y=1000
scene.render.filepath=str(OUT/'sam-travel-couple-closeup.png')
bpy.ops.render.render(write_still=True)

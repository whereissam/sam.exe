"""Original SAM.EXE Blender diorama, composed from the editable district kit."""
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from couple import create_couple

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'blender'
if not bpy.app.background:
    raise RuntimeError('Run in a fresh background Blender process.')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
MATERIALS = {}


def material(color, emission=0):
    key=(color,emission)
    if key in MATERIALS:return MATERIALS[key]
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    mat=bpy.data.materials.new(color)
    mat.use_nodes=True
    node=mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value=(*rgb,1)
    node.inputs['Roughness'].default_value=.68
    if emission:
        node.inputs['Emission Color'].default_value=(*rgb,1)
        node.inputs['Emission Strength'].default_value=emission
    MATERIALS[key]=mat
    return mat


def finish(name,color,emission=0):
    obj=bpy.context.object;obj.name=name;obj.data.materials.append(material(color,emission));return obj


def box(name,p,size,color):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p)
    bpy.context.object.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(name,color)


def cylinder(name,p,radius,depth,color,vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=p)
    return finish(name,color)


def ring(name,p,radius,color,rotation=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=8,major_radius=radius,minor_radius=.035,location=p,rotation=rotation)
    return finish(name,color,2)


camera_position=Vector((12,-18,15))
def text(name,body,p,size,color):
    bpy.ops.object.text_add(location=p)
    obj=bpy.context.object;obj.name=name;obj.data.body=body;obj.data.align_x='CENTER';obj.data.size=size;obj.data.extrude=.008;obj.data.bevel_depth=.003
    obj.rotation_euler=(camera_position-Vector(p)).to_track_quat('Z','Y').to_euler()
    obj.data.materials.append(material(color,.3))
    return obj


# A suspended, eight-sided slice of a personal world.
cylinder('Island crown',(0,0,0),6.4,1.2,'#77648b')
cylinder('Island walking surface',(0,0,.62),6.42,.08,'#a18baa')
bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=2.8,radius2=5.9,depth=2,location=(0,0,-1.6))
finish('Suspended rock','#443854')
ring('Island rim',(0,0,.67),6.05,'#e9b5cf',(0,0,0))
box('East west path',(0,0,.69),(10.4,.65,.06),'#c0a5b8')
box('North south path',(0,0,.695),(.65,9.8,.06),'#c0a5b8')
for i in range(-8,9):
    box('Path inset',(i*.55,0,.735),(.22,.035,.018),'#f0d6bf')

catalog=json.loads((ROOT/'components/world/model-manifest.json').read_text())
placements=[('robotics',(0,-2,.73),1.05),('photography',(-3.2,-2,.73),1.12),('frontend',(3,-1.8,.73),1),('ai',(-3,1.5,.73),.88),('blockchain',(3,1.7,.73),.9),('travel',(0,1.7,.73),.86)]
for name,position,scale in placements:
    cylinder(name+' terrace',(position[0],position[1],.72),1.48,.12,'#635274',6)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public'/catalog[name].lstrip('/')))
    imported=list(bpy.context.selected_objects)
    bpy.ops.object.empty_add(location=position)
    parent=bpy.context.object;parent.name=name+' installation';parent.scale=(scale,)*3
    for obj in imported:
        if obj.parent is None:obj.parent=parent

# Four explicitly requested cities, with individual portal colors.
for city,p,color in [('BERLIN',(-4.9,0,.8),'#d7a0ff'),('TAIPEI',(-1.6,4.65,.8),'#b7f5c4'),('NEW YORK',(4.5,2.8,.8),'#f5bc79'),('TOKYO',(5,.1,.8),'#ff927b')]:
    cylinder(city+' portal base',p,.65,.2,'#54445f',8)
    ring(city+' portal',(p[0],p[1],p[2]+.7),.48,color)
    text(city+' sign',city,(p[0],p[1]-.08,p[2]+1.36),.23,color)

# Typography belongs to the scene and remains editable in Blender.
text('Main signature','SAM.EXE',(0,3.3,4.35),1.04,'#f7e8ce')
text('World subtitle','BUILD  /  SEE  /  WANDER',(0,3.3,3.67),.2,'#b7f5c4')
# Stylized trees and small guiding lights.
for i,(x,y) in enumerate([(-4.1,3.3),(-4.7,-2.9),(-1.9,-4.5),(1.8,-4.5)]):
    box('Tree trunk',(x,y,1.06),(.1,.1,.75),'#866e85')
    for tier in range(3):
        bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.46-tier*.09,depth=.65,location=(x,y,1.5+tier*.3))
        finish('Faceted crown',['#be8eae','#dda6ba','#f1c0bd'][tier])
for x,y in [(-1,0),(1,0),(0,-.7),(0,3.4)]:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.11,location=(x,y,1))
    finish('Curiosity spark','#ffd69a',3)

# Personalized travel companions on the island's front promenade.
create_couple((0, -4.5, .74), .78)

# Deep mauve backdrop and warm studio light; no external textures.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-3))
finish('Mauve stage','#33283e')
bpy.ops.object.camera_add(location=camera_position)
camera=bpy.context.object
camera.rotation_euler=(Vector((0,.1,1.1))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=18.5
scene=bpy.context.scene;scene.camera=camera
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.11,.07,.16,1)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.45
for name,loc,power,size,color in [('Sunset key',(-6,-8,13),2100,8,(1,.74,.52)),('Lavender fill',(7,2,10),1900,7,(.64,.56,1)),('Mint rim',(-3,8,9),1700,6,(.65,1,.83))]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    obj=bpy.context.object;obj.name=name;obj.data.energy=power;obj.data.color=color;obj.data.shape='DISK';obj.data.size=size
    obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1800;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'sam-exe-personal-world.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sam-exe-personal-world.blend'))
bpy.ops.render.render(write_still=True)

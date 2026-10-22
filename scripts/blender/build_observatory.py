"""Original AI observatory and explorer, exported as texture-free web GLBs."""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
def material(color,metal=0):
    if color not in materials:
        m=bpy.data.materials.new(color);m.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (1,3,5)],1);m.use_nodes=True
        rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in m.diffuse_color[:3]]
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*rgb,1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.65
        m.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=metal
        materials[color]=m
    return materials[color]
def finish(name,color):
    o=bpy.context.object;o.name=name;o.data.materials.append(material(color))
    return o
def xyz(p):return (p[0],-p[2],p[1])
def box(name,p,size,color,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        m=o.modifiers.new('Crafted edges','BEVEL');m.width=bevel;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(name,color)
def sphere(name,p,r,color,scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=r,location=xyz(p));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for f in o.data.polygons:f.use_smooth=True
    return finish(name,color)
def rod(name,a,b,r,color,vertices=16):
    a,b=Vector(xyz(a)),Vector(xyz(b));bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=(b-a).length,location=(a+b)/2)
    bpy.context.object.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return finish(name,color)
def arc(name,r,y,start,end,color,tube=.06,cx=0,cz=0):
    points=[(cx+r*math.cos(start+(end-start)*i/32),y,cz+r*math.sin(start+(end-start)*i/32)) for i in range(33)]
    for a,b in zip(points,points[1:]):rod(name,a,b,tube,color,8)
def export(name):
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=name
    path=ROOT/'assets/blender'/f'{name}.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True)
    data=path.read_bytes();hashed=f'{name}-{hashlib.sha256(data).hexdigest()[:10]}.glb';(ROOT/'public/models'/hashed).write_bytes(data)
    return '/models/'+hashed
# A circular observatory with the visitor-facing half cut away.
rod('Stone foundation',(0,-.4,0),(0,-.08,0),6.1,'#b7a389',64)
rod('Warm terrazzo floor',(0,-.08,0),(0,.035,0),5.98,'#ded2b3',64)
arc('Brass floor inlay',5.6,.045,0,math.tau,'#a88a53',.018)
# Only the rear arc has walls; the experiment remains readable from above.
for i in range(24):
    angle=math.pi+math.pi*i/24;next_angle=math.pi+math.pi*(i+1)/24
    a=(5.9*math.cos(angle),.75,5.9*math.sin(angle));b=(5.9*math.cos(next_angle),.75,5.9*math.sin(next_angle))
    # Individual broad vertical panels make a curved plaster wall.
    o=box('Curved plaster panel',((a[0]+b[0])/2,.75,(a[2]+b[2])/2),(.83,1.5,.18),'#c0b3a4',.025);o.rotation_euler.z=-(angle+math.pi/2+math.pi/48)
arc('Rear cornice',5.9,1.56,math.pi,math.tau,'#e8d9b6',.09)
for angle in [3.5,4.05,4.71,5.37,5.92]:
    x,z=5.75*math.cos(angle),5.75*math.sin(angle)
    box('Observatory pier',(x,1.55,z),(.22,3.1,.22),'#e1d2ae',.04)
arc('Open dome ring',5.75,3.12,3.5,5.92,'#af8d59',.07)
# Telescope on a proper three-legged mount, beyond the grid.
cx,cz=-4.2,-3.2
for angle in [0,2.094,4.188]:rod('Telescope tripod',(cx+.63*math.cos(angle),.08,cz+.63*math.sin(angle)),(cx,1.2,cz),.06,'#856b4e')
rod('Telescope pivot',(cx,1.1,cz),(cx,1.65,cz),.12,'#b39661')
a=(cx-.18,1.6,cz+.2);b=(cx+.5,2.25,cz-.7)
rod('Brass telescope barrel',a,b,.24,'#b7955d',24)
rod('Dark lens rim',(b[0]-.035,b[1]-.035,b[2]+.045),(b[0]+.045,b[1]+.045,b[2]-.06),.27,'#4f5d59',24)
rod('Lens glass',b,(b[0]+.05,b[1]+.05,b[2]-.065),.218,'#87b0a6',24)
rod('Eyepiece',(a[0]-.16,a[1]-.15,a[2]+.21),a,.09,'#4f5d59')
# Research shelf and chart desk on the opposite side.
for y in [.12,.78,1.44]:box('Oak shelf',(4.25,y,-3.1),(1.6,.1,.65),'#9f815d')
for x in [3.52,4.98]:box('Shelf upright',(x,.8,-3.1),(.1,1.6,.65),'#8d7355')
for i,color in enumerate(['#7f998c','#bd9278','#998a9c','#b4aa7f','#7e929c']):
    box('Research notebook',(3.72+i*.23,1.02,-3.05),(.15,.4,.38),color,.012)
box('Instrument drawer',(4.2,.4,-3.02),(1.2,.4,.45),'#c6ad82')
box('Drawer handle',(4.2,.4,-2.78),(.25,.035,.035),'#7b694e',.01)
# Planter marks the greenhouse side.
rod('Greenhouse planter',(4.5,.04,-.6),(4.5,.48,-.6),.4,'#ac8263')
for i in range(5):
    angle=i*2.4;sphere('Leaves',(4.5+.18*math.cos(angle),.75+i*.08,-.6+.18*math.sin(angle)),.22,'#81956c',(.7,1.6,.7))
room=export('ai-observatory')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/ai-observatory.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Soft shell, two rubber wheels, inset face, and a parcel shelf.
box('Explorer body',(0,.34,0),(.48,.43,.42),'#e6dcbf',.085)
box('Explorer head',(0,.67,0),(.47,.28,.43),'#aabda7',.075)
box('Inset face',(0,.68,.207),(.36,.15,.025),'#405852',.035)
for x in [-.095,.095]:sphere('Warm eye',(x,.69,.23),.025,'#f3d99a',(.7,1,.35))
for x in [-.285,.285]:
    rod('Rubber wheel',(x-.045,.16,0),(x+.045,.16,0),.16,'#4d514c',20)
    rod('Wheel hub',(x-.047,.16,0),(x+.047,.16,0),.075,'#b0b4a1',16)
box('Rear battery',(0,.36,-.24),(.29,.28,.12),'#829b8c',.025)
box('Parcel tray',(0,.23,.34),(.42,.055,.34),'#c0aa80',.025)
rod('Antenna',(0,.79,-.08),(0,.98,-.08),.018,'#827a5b',10)
sphere('Antenna lamp',(0,1.01,-.08),.047,'#dbc987')
robot=export('ai-explorer')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/ai-explorer.blend'))
(ROOT/'components/ai/model-manifest.json').write_text(json.dumps({'room':room,'robot':robot},indent=2)+'\n')
print(json.dumps({'room':room,'robot':robot}))

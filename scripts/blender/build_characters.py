"""Export articulated rigid-part avatars; animation is driven by R3F joints."""
import hashlib
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from couple import create_couple
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
pair,objects=create_couple(explore=True)
owned={index:[obj for obj in objects if obj.get('character_index')==index] for index in [0,1]}
catalog={};report={}
for index,name in enumerate(['sam','companion']):
    cx=[-.49,.49][index]
    bpy.ops.object.empty_add();root=bpy.context.object;root.name=name
    pivots={}
    for joint,p in {'Body':(cx,0,0),'Head':(cx,0,1.48),'ArmL':(cx-.34,0,1.28),'ArmR':(cx+.34,0,1.28),'LegL':(cx-.17,0,.74),'LegR':(cx+.17,0,.74)}.items():
        bpy.ops.object.empty_add(location=p);pivot=bpy.context.object;pivot.name=joint;pivots[joint]=pivot
    buckets={key:[] for key in pivots}
    for obj in owned[index]:
        label=obj.name.lower();joint='Body'
        if any(word in label for word in ['trousers','sneaker','sole']):joint='LegL' if obj.location.x<cx else 'LegR'
        elif any(word in label for word in ['sleeve','forearm','hand']):joint='ArmL' if obj.location.x<cx else 'ArmR'
        elif not any(word in label for word in ['shirt','neck','camera','strap']):joint='Head'
        world=obj.matrix_world.copy();obj.parent=pivots[joint];obj.matrix_world=world
        buckets[joint].append(obj)
    # Join by joint: materials stay shared, editable joints stay separate.
    for joint,parts in buckets.items():
        if not parts:continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in parts:obj.select_set(True)
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
        bpy.context.object.name=joint+'Mesh'
    for pivot in pivots.values():
        pivot.parent=root;pivot.location.x-=cx
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for obj in root.children_recursive:obj.select_set(True)
    out=ROOT/'assets/blender'/f'{name}-avatar.glb'
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True)
    data=out.read_bytes();digest=hashlib.sha256(data).hexdigest()[:10]
    filename=f'{name}-avatar-{digest}.glb';(ROOT/'public/models'/filename).write_bytes(data)
    catalog[name]='/models/'+filename
    report[name]={'bytes':len(data)}
    # Names must remain stable in both independently exported files.
    for pivot in pivots.values():pivot.name=name+'_'+pivot.name
    root.location.x=cx
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/sam-animated-companions.blend'))
(ROOT/'components/world/character-manifest.json').write_text(json.dumps(catalog,indent=2)+'\n')
print(json.dumps(report))

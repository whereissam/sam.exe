"""Build skinned stylized humanoids with runtime-compatible joint axes.

Bone labels retain the web app's API; humanoid_map records retargeting roles.
All bone local Y axes point upward, keeping the existing web poses compatible.
"""
import hashlib
import json
import sys
sys.dont_write_bytecode = True
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from couple import create_couple
ROOT = Path(__file__).resolve().parents[2]
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
pair, objects = create_couple(explore=True)
owned = {i: [obj for obj in objects if obj.get('character_index') == i] for i in [0, 1]}
catalog = {}
for index, name in enumerate(['sam', 'companion']):
    cx = [-.49, .49][index]
    # Positions preserve seated, tea and handheld-prop compatibility.
    spec = {
        'Body': ((0, 0, 0), None, 'root'),
        'Hips': ((0, 0, .74), 'Body', 'hips'),
        'Spine': ((0, 0, .94), 'Hips', 'spine'),
        'Chest': ((0, 0, 1.20), 'Spine', 'chest'),
        'Neck': ((0, 0, 1.39), 'Chest', 'neck'),
        'Head': ((0, 0, 1.48), 'Neck', 'head'),
    }
    for side, sign, human in [('L', -1, 'right'), ('R', 1, 'left')]:
        # The historical L/R labels are screen sides; character faces -Y.
        spec.update({
            'Shoulder'+side: ((sign*.16, 0, 1.28), 'Chest', human+'Shoulder'),
            'Arm'+side: ((sign*.34, 0, 1.28), 'Shoulder'+side, human+'UpperArm'),
            'Elbow'+side: ((sign*.46, -.035, 1.02), 'Arm'+side, human+'LowerArm'),
            'Hand'+side: ((sign*.46, -.13, .755), 'Elbow'+side, human+'Hand'),
            'Leg'+side: ((sign*.17, 0, .74), 'Hips', human+'UpperLeg'),
            'Knee'+side: ((sign*.17, .015, .44), 'Leg'+side, human+'LowerLeg'),
            'Foot'+side: ((sign*.17, -.025, .14), 'Knee'+side, human+'Foot'),
            'Toe'+side: ((sign*.17, -.23, .07), 'Foot'+side, human+'Toes'),
        })
    armature = bpy.data.armatures.new(name+' humanoid skeleton')
    rig = bpy.data.objects.new(name, armature)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    rig.show_in_front = True
    rig['humanoid_map'] = json.dumps({role: joint for joint, (_, _, role) in spec.items()})
    rig['rig_version'] = 2
    bpy.ops.object.mode_set(mode='EDIT')
    for joint, (position, parent, _) in spec.items():
        bone = armature.edit_bones.new(joint)
        bone.head = position
        bone.tail = Vector(position) + Vector((0, 0, .10))
        if parent: bone.parent = armature.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for obj in owned[index]:
        label = obj.name.lower()
        side = 'L' if obj.location.x < cx else 'R'
        joint = 'Chest'
        if any(word in label for word in ['sneaker', 'sole']): joint = 'Foot'+side
        elif 'shin' in label: joint = 'Knee'+side
        elif any(word in label for word in ['trousers', 'thigh']): joint = 'Leg'+side
        elif 'hand' in label: joint = 'Hand'+side
        elif 'forearm' in label: joint = 'Elbow'+side
        elif 'sleeve' in label: joint = 'Arm'+side
        elif 'neck' in label: joint = 'Neck'
        elif not any(word in label for word in ['shirt', 'camera', 'strap']): joint = 'Head'
        world = obj.matrix_world.copy()
        obj.parent = rig
        obj.matrix_world = world
        obj.location.x -= cx
        if 'shirt' in label:
            # Blend the torso across pelvis, waist and chest for actual bending.
            groups = {key: obj.vertex_groups.new(name=key) for key in ['Hips', 'Spine', 'Chest']}
            for vertex in obj.data.vertices:
                z = (obj.matrix_world @ vertex.co).z
                if z < .94:
                    a, b, t = 'Hips', 'Spine', max(0, min(1, (z-.74)/.20))
                else:
                    a, b, t = 'Spine', 'Chest', max(0, min(1, (z-.94)/.26))
                if t < 1: groups[a].add([vertex.index], 1-t, 'REPLACE')
                if t > 0: groups[b].add([vertex.index], t, 'REPLACE')
        else:
            group = obj.vertex_groups.new(name=joint)
            group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in owned[index]: obj.select_set(True)
    bpy.context.view_layer.objects.active = owned[index][0]
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = name+' skinned body'
    modifier = mesh.modifiers.new('Humanoid skin', 'ARMATURE')
    modifier.object = rig
    rig.select_set(True)
    bpy.context.view_layer.update()
    out = ROOT/'assets/blender'/f'{name}-avatar.glb'
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True, export_extras=True, export_texcoords=False)
    data = out.read_bytes()
    digest = hashlib.sha256(data).hexdigest()[:10]
    filename = f'{name}-avatar-{digest}.glb'
    (ROOT/'public/models'/filename).write_bytes(data)
    catalog[name] = '/models/'+filename
    rig.location.x = cx
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/sam-animated-companions.blend'))
(ROOT/'components/world/character-manifest.json').write_text(json.dumps(catalog, indent=2)+'\n')
print(json.dumps(catalog))

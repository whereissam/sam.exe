"""SAM.EXE static low-poly district kit. Run only in a fresh background Blender process.

Coordinates below use web axes (X right, Y up, Z forward). Helpers convert to
Blender Z-up; the glTF exporter converts back to Y-up. No network or textures.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'models'
SOURCE = ROOT / 'assets' / 'blender'
MATERIALS = {}
COLLECTION = None
MAX_TRIANGLES = 12000
MAX_BYTES = 500_000


def web(point):
    x, y, z = point
    return x, -z, y


def linear(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def material(hex_color, glow=False):
    key = (hex_color, glow)
    if key not in MATERIALS:
        color = tuple(linear(int(hex_color[i:i+2], 16) / 255) for i in (1, 3, 5)) + (1,)
        mat = bpy.data.materials.new(hex_color + ('_light' if glow else ''))
        mat.diffuse_color = color
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = color
        shader.inputs['Roughness'].default_value = 0.65
        if glow:
            shader.inputs['Emission Color'].default_value = color
            shader.inputs['Emission Strength'].default_value = 1.6
        MATERIALS[key] = mat
    return MATERIALS[key]


def finish(name, color, glow=False):
    obj = bpy.context.object
    obj.name = name
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    COLLECTION.objects.link(obj)
    obj.data.materials.append(material(color, glow))
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


def box(name, p, size, color, glow=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=web(p))
    bpy.context.object.dimensions = (size[0], size[2], size[1])
    return finish(name, color, glow)


def cylinder(name, p, radius, depth, color, axis='y', vertices=16):
    rotation = (math.pi / 2, 0, 0) if axis == 'z' else (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                      location=web(p), rotation=rotation)
    return finish(name, color)


def ring(name, p, radius, color, axis='z'):
    rotation = {'z': (math.pi / 2, 0, 0), 'x': (0, math.pi / 2, 0), 'y': (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=6,
                                   major_radius=radius, minor_radius=0.035,
                                   location=web(p), rotation=rotation)
    return finish(name, color, True)


def orb(name, p, radius, color):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=web(p))
    return finish(name, color)


def robotics():
    box('workbench', (0,.16,0), (1.7,.3,1.3), '#45405c')
    for x in (-.25,.25):
        box('boot', (x,.42,.1), (.34,.22,.5), '#dce8ce')
        box('shin', (x,.76,0), (.24,.5,.26), '#77968e')
        cylinder('knee', (x,1.02,0), .16,.32,'#45405c','z')
    box('torso',(0,1.4,0),(.75,.72,.46),'#b7f5c4')
    box('chest_light',(0,1.4,.24),(.3,.12,.025),'#b7f5c4',True)
    box('head',(0,2,0),(.87,.55,.62),'#dce8ce')
    box('visor',(0,2,.32),(.66,.22,.03),'#292b40')
    for x in (-.18,.18):
        box('eye',(x,2,.345),(.09,.055,.025),'#b7f5c4',True)
    for x in (-.57,.57):
        box('arm',(x,1.35,0),(.23,.72,.26),'#adcbbb')
    box('antenna',(.25,2.42,0),(.035,.3,.035),'#b7f5c4',True)


def frontend():
    box('desk',(0,.85,0),(2.45,.15,1.2),'#aa7e70')
    for x in (-1,1):
        box('leg',(x,.43,0),(.12,.85,.8),'#45405c')
    box('screen_stand',(0,1.18,-.12),(.18,.55,.15),'#ddc2a4')
    box('monitor',(0,1.8,-.16),(2,1.3,.2),'#ddc2a4')
    box('display',(0,1.8,-.045),(1.79,1.08,.025),'#292b40')
    for row in range(5):
        box('code_line',(-.18+(row%2)*.15,2.13-row*.16,-.025),
            (.95-(row%3)*.2,.035,.015), '#b7f5c4' if row%2 else '#f5bc79',True)
    box('keyboard',(0,.96,.38),(1.1,.05,.35),'#ddc2a4')
    cylinder('coffee',(.92,1.08,.32),.12,.3,'#f5bc79')


def blockchain():
    for i, x in enumerate((-.82,0,.82)):
        h = 1.6+i*.5
        box('node_tower',(x,h/2+.15,0),(.65,h,.8),'#796087')
        for row in range(5):
            box('node_light',(x,.42+row*.28,.41),(.43,.055,.02),'#d7a0ff',True)
    orb('network_core',(0,3.2,0),.43,'#d7a0ff')
    ring('network_orbit',(0,3.2,0),.64,'#d7a0ff','y')


def ai():
    cylinder('plinth',(0,.25,0),.72,.5,'#9b7182',vertices=8)
    box('support',(0,.7,0),(.15,.55,.15),'#9b7182')
    orb('intelligence_core',(0,1.6,0),.58,'#ffb995')
    ring('orbit_a',(0,1.6,0),1.05,'#ff927b','x')
    ring('orbit_b',(0,1.6,0),.85,'#ff927b','y')
    orb('satellite',(.95,1.6,0),.13,'#ff927b')


def photography():
    box('plinth',(0,.17,0),(1.6,.3,1.1),'#6a5664')
    box('camera_body',(0,1.05,0),(1.7,1,.65),'#e8d4a1')
    box('grip',(-.7,1.05,.13),(.28,.9,.65),'#54465b')
    box('viewfinder',(-.35,1.64,0),(.5,.22,.45),'#e8d4a1')
    box('finder_glass',(-.35,1.64,.235),(.29,.11,.025),'#292b40')
    cylinder('lens',(0.25,1.05,.5),.4,.43,'#292b40','z',24)
    ring('lens_rim',(.25,1.05,.73),.32,'#e8d4a1')
    cylinder('glass',(.25,1.05,.735),.27,.02,'#718d96','z',24)
    box('support',(0,.48,0),(.18,.35,.18),'#54465b')
    cylinder('shutter',(.6,1.61,0),.11,.12,'#54465b')


def travel():
    box('station',(0,.16,0),(1.8,.3,1),'#698997')
    ring('portal',(0,1.42,0),1.05,'#93dce1')
    ring('meridian',(0,1.42,0),.8,'#93dce1','x')
    orb('globe',(0,1.42,0),.53,'#86b6ba')
    ring('equator',(0,1.42,0),.58,'#e8d4a1','y')
    box('suitcase',(-.92,.64,.2),(.42,.65,.45),'#e8d4a1')
    box('handle',(-.92,1.02,.2),(.22,.08,.12),'#54465b')


def main():
    global COLLECTION
    if not bpy.app.background:
        raise RuntimeError('Use bun run models:build in a fresh background process, not a working Blender scene.')
    if bpy.app.version < (4, 0, 0):
        raise RuntimeError('Blender 4.0 or later is required.')
    # Only this factory-startup process is cleared; no user .blend is opened.
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    OUT.mkdir(parents=True, exist_ok=True)
    SOURCE.mkdir(parents=True, exist_ok=True)
    catalog, report = {}, {}
    for name, build in [('robotics', robotics), ('frontend', frontend), ('blockchain', blockchain),
                        ('ai', ai), ('photography', photography), ('travel', travel)]:
        COLLECTION = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(COLLECTION)
        build()
        # Keep editable source objects; export just this district at world origin.
        bpy.ops.object.select_all(action='DESELECT')
        triangles = 0
        for obj in COLLECTION.objects:
            obj.select_set(True)
            obj.data.calc_loop_triangles()
            triangles += len(obj.data.loop_triangles)
        if triangles > MAX_TRIANGLES:
            raise RuntimeError(f'{name}: {triangles} triangles exceeds {MAX_TRIANGLES}')
        temp = OUT / f'{name}.pending.glb'
        bpy.ops.export_scene.gltf(filepath=str(temp), export_format='GLB',
                                 use_selection=True, export_yup=True, export_apply=True,
                                 export_animations=False, export_cameras=False, export_lights=False)
        data = temp.read_bytes()
        if len(data) > MAX_BYTES:
            raise RuntimeError(f'{name}: GLB exceeds {MAX_BYTES} bytes')
        digest = hashlib.sha256(data).hexdigest()[:12]
        filename = f'{name}-{digest}.glb'
        temp.replace(OUT / filename)
        catalog[name] = '/models/' + filename
        report[name] = {'triangles': triangles, 'bytes': len(data), 'objects': len(COLLECTION.objects)}
    # Content-addressed exports preserve old assets until the catalog is ready.
    # Keep each district at origin in the source for predictable re-export.
    for collection in bpy.context.scene.collection.children:
        collection.hide_viewport = collection.name != 'photography'
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'sam-exe-kit.generated.blend'))
    (SOURCE / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    catalog_path = ROOT / 'components' / 'world' / 'model-manifest.json'
    pending = catalog_path.with_suffix('.pending.json')
    pending.write_text(json.dumps(catalog, indent=2) + '\n')
    pending.replace(catalog_path)
    print('SAM.EXE models exported:', json.dumps(report, indent=2))


if __name__ == '__main__':
    main()

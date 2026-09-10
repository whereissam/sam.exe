"""Texture-free travel companions inspired by the supplied couple photograph."""
import math
import bpy
from mathutils import Vector


def create_couple(position=(0, 0, 0), scale=1, explore=False):
    materials = {}
    objects = []

    def finish(name, color):
        obj = bpy.context.object
        obj.name = name
        if color not in materials:
            mat = bpy.data.materials.new(name + ' material')
            rgb = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
            mat.diffuse_color = (*[v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb], 1)
            mat.use_nodes = True
            mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = mat.diffuse_color
            mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .78
            materials[color] = mat
        obj.data.materials.append(materials[color])
        objects.append(obj)
        return obj

    def rounded(name, p, size, color, bevel=.08):
        bpy.ops.mesh.primitive_cube_add(size=1, location=p)
        obj = bpy.context.object
        obj.dimensions = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        mod = obj.modifiers.new('Soft low-poly edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        return finish(name, color)

    def sphere(name, p, size, color):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=1, location=p)
        obj = bpy.context.object
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        return finish(name, color)

    def limb(name, a, b, radius, color):
        a, b = Vector(a), Vector(b)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=(b-a).length, location=(a+b)/2)
        bpy.context.object.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
        return finish(name, color)

    def face_shape(name, x, top, index, color):
        # Independent forehead, cheek, jaw and chin profiles, rather than a cube.
        profiles = [
            (-.73, .045, .07), (-.70, .115, .145),
            (-.65, .19 if index == 0 else .155, .195),
            (-.57, .265 if index == 0 else .225, .235),
            (-.47, .307 if index == 0 else .28, .26),
            (-.37, .325 if index == 0 else .306, .265),
            (-.26, .315 if index == 0 else .301, .255),
            (-.14, .305 if index == 0 else .285, .247),
            (-.04, .267, .22), (.035, .17, .15), (.06, .035, .04),
        ]
        vertices, faces = [], []
        segments = 32
        for z, width, depth in profiles:
            for i in range(segments):
                angle = i*math.tau/segments
                c = math.cos(angle)
                # Broad front plane with rounded temples, fuller back of skull.
                y = -.005-depth*math.copysign(abs(c)**.55, c)
                vertices.append((x+width*math.sin(angle), y, top+z))
        for row in range(len(profiles)-1):
            for i in range(segments):
                a = row*segments+i; b = row*segments+(i+1)%segments
                faces.append((a, b, b+segments, a+segments))
        faces.extend([tuple(reversed(range(segments))), tuple((len(profiles)-1)*segments+i for i in range(segments))])
        mesh = bpy.data.meshes.new(name+' sculpted topology')
        mesh.from_pydata(vertices, [], faces); mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        finish(name, color)
        for polygon in mesh.polygons:
            polygon.use_smooth = True

        def surface(dx, z):
            for (z0,w0,d0),(z1,w1,d1) in zip(profiles, profiles[1:]):
                if z0 <= z <= z1:
                    t=(z-z0)/(z1-z0); w=w0+(w1-w0)*t; d=d0+(d1-d0)*t
                    return -.005-d*max(0, 1-(dx/w)**2)**.275
            return -.24
        return surface

    def stroke(name, points, radius, color):
        for a, b in zip(points, points[1:]):
            limb(name, a, b, radius, color)

    skin = '#e7aa86'
    for index, x in enumerate([-.49, .49]):
        first_object = len(objects)
        prefix = 'Sam' if index == 0 else 'Travel companion'
        shirt = '#30383d' if index == 0 else '#b5a0e2'
        top = 2.18 if index == 0 else 2.13
        for side in [-1, 1]:
            px = x + side*.17
            rounded(prefix+' trousers', (px, .015, .44), (.25, .3, .63), '#515567' if index == 0 else '#e8dfd2')
            rounded(prefix+' sneaker', (px, -.085, .115), (.29, .48, .2), '#f6ebda', .045)
            rounded(prefix+' sole', (px, -.085, .045), (.3, .49, .065), '#a899b4', .018)
        rounded(prefix+' shirt', (x, 0, 1.05), (.73, .43, .72), shirt, .13)
        limb(prefix+' neck', (x, 0, 1.36), (x, 0, 1.54), .13, skin)
        surface = face_shape(prefix+' face', x, top, index, skin)
        for side in [-1, 1]:
            sphere(prefix+' ear', (x+side*.312, .005, top-.385), (.046, .053, .081), skin)
            eye_x = side*.127
            eye_z = -.337
            eye_y = surface(eye_x, eye_z)
            # A single shallow eye surface follows the cheek; no protruding eyeball.
            verts=[(x+eye_x,eye_y-.015,top+eye_z)]
            for i in range(24):
                angle=i*math.tau/24
                dx=eye_x+.034*math.cos(angle)
                z=eye_z+(.016 if index == 0 else .019)*math.sin(angle)
                verts.append((x+dx,surface(dx,z)-.012,top+z))
            mesh=bpy.data.meshes.new(prefix+' inset eye surface')
            mesh.from_pydata(verts,[],[(0,i+1,(i+1)%24+1) for i in range(24)]);mesh.update()
            eye=bpy.data.objects.new(prefix+' eye',mesh);bpy.context.collection.objects.link(eye);bpy.context.view_layer.objects.active=eye
            finish(prefix+' eye','#302725')
            sphere(prefix+' eye glint', (x+eye_x-.007, surface(eye_x-.007,eye_z+.006)-.017, top+eye_z+.006), (.0035, .002, .0035), '#f7dec5')
            lid=[]; brow=[]
            for i in range(7):
                t=i/6; dx=eye_x+(t-.5)*.103
                z=eye_z+.017*math.sin(math.pi*t)+side*(t-.5)*.008
                lid.append((x+dx, surface(dx,z)-.013, top+z))
                bz=-.253+.016*math.sin(math.pi*t)-side*(t-.5)*.009
                brow.append((x+dx, surface(dx,bz)-.009, top+bz))
            stroke(prefix+' softly arched eyebrow', brow, .010 if index == 0 else .007, '#49332d')
        bridge = sphere(prefix+' nose bridge', (x, -.258, top-.389), (.025, .023, .070), skin)
        tip = sphere(prefix+' nose tip', (x, -.283, top-.447), (.041 if index == 0 else .033, .036, .029), skin)
        for part in [bridge, tip]:
            for polygon in part.data.polygons: polygon.use_smooth=True
        for side in [-1,1]:
            sphere(prefix+' nose wing', (x+side*.029, -.266, top-.454), (.020, .022, .015), skin)
        # Small, flush smiles: no separate lip or tooth volumes.
        smile=[]
        width=.135 if index == 0 else .145
        for i in range(17):
            t=i/16; dx=(t-.5)*width
            z=-.545-(.006 if index == 0 else .014)*math.sin(math.pi*t)
            smile.append((x+dx,surface(dx,z)-.008,top+z))
        for i,(a,b) in enumerate(zip(smile,smile[1:])):
            taper=.0017+.0015*math.sin(math.pi*(i+.5)/16)
            limb(prefix+' gentle smile',a,b,taper,'#986452')
        # Fitted outer shell clears the sculpted forehead without intersections.
        hair_vertices=[]; hair_faces=[]
        for z,w,d in [(-.18,.331,.277),(-.06,.321,.272),(.065,.235,.208),(.135,.025,.025)]:
            for i in range(24):
                a=i*math.tau/24; c=math.cos(a)
                hair_vertices.append((x+w*math.sin(a),-.005-d*math.copysign(abs(c)**.55,c),top+z))
        for row in range(3):
            for i in range(24):
                a=row*24+i;b=row*24+(i+1)%24
                hair_faces.append((a,b,b+24,a+24))
        hair_faces.append(tuple(72+i for i in range(24)))
        mesh=bpy.data.meshes.new(prefix+' fitted hair');mesh.from_pydata(hair_vertices,[],hair_faces);mesh.update()
        hair=bpy.data.objects.new(prefix+' hair',mesh);bpy.context.collection.objects.link(hair);bpy.context.view_layer.objects.active=hair
        finish(prefix+' hair','#242326' if index == 0 else '#49312c')
        sphere(prefix+' back hair', (x, .20, top-.27), (.315, .13, .25), '#242326' if index == 0 else '#49312c')
        if index == 0:
            fringe = sphere('Side-swept fringe', (x-.12, -.18, top-.11), (.23, .12, .10), '#242326')
            fringe.rotation_euler[1] = -.28
        else:
            sphere('Tied-up bun', (x+.055, .16, top+.15), (.21, .18, .20), '#49312c')
            sphere('Hair tie', (x+.055, .16, top+.04), (.14, .14, .065), '#b5a0e2')
            for side in [-1, 1]:
                sphere('Swept side hair', (x+side*.29, .005, top-.2), (.07, .22, .19), '#49312c')
        for outer in ([-1,1] if explore else [-1 if index == 0 else 1]):
            a = (x+outer*.34, 0, 1.28)
            b = (x+outer*.46, -.035, 1.02)
            c = (x+outer*.46, -.13, .82)
            limb(prefix+' sleeve', a, b, .12, shirt)
            limb(prefix+' forearm', b, c, .085, skin if index == 0 else shirt)
            sphere(prefix+' hand', (c[0],c[1],c[2]-.065), (.075, .065, .085), skin)
        for obj in objects[first_object:]: obj['character_index']=index
    # The inside arms rest behind each other's shoulders.
    if not explore:
        # Bent elbow behind the back, with a visible hand resting on the shoulder.
        limb('Companion upper arm', (.05, .07, 1.28), (-.12, .31, 1.24), .105, '#b5a0e2')
        sphere('Companion bent elbow', (-.12,.31,1.24), (.10,.095,.095), '#b5a0e2')
        limb('Companion forearm behind back', (-.12,.31,1.24), (-.65,.20,1.31), .085, '#b5a0e2')
        limb('Companion wrist over shoulder', (-.65,.20,1.31), (-.70,.015,1.31), .065, '#b5a0e2')
        sphere('Hand resting on shoulder', (-.70,-.045,1.30), (.073,.075,.047), skin)
        limb('Sam upper arm behind companion', (-.05,.09,1.22), (.02,.30,.99), .10, '#30383d')
        limb('Sam bent forearm behind companion', (.02,.30,.99), (.64,.22,1.06), .075, skin)
    camera_start=len(objects)
    limb('Camera strap left', (-.73, -.245, 1.39), (-.46, -.31, .94), .017, '#171c22')
    limb('Camera strap right', (-.22, -.245, 1.39), (-.43, -.31, .94), .017, '#171c22')
    rounded('Travel camera', (-.45, -.31, .92), (.34, .17, .22), '#252b35', .028)
    lens = limb('Camera lens', (-.45, -.41, .92), (-.45, -.49, .92), .075, '#a2d8cd')
    rounded('Camera viewfinder', (-.45, -.31, 1.055), (.12, .12, .06), '#252b35', .012)
    for obj in objects[camera_start:]: obj['character_index']=0
    if not explore:
        # Close the torso gap so the embrace does not stretch across empty space.
        for obj in objects:
            if 'character_index' in obj:obj.location.x += .10 if obj['character_index']==0 else -.10
    bpy.ops.object.empty_add(location=position)
    root = bpy.context.object
    root.name = 'Sam and companion — travel together'
    root.scale = (scale,)*3
    for obj in objects:
        obj.parent = root
    return root, objects

'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let camera;
let inputs = []
let spans = []

let pi = 3.14;
let u1 = -3.5 * pi;
let u2 = 3.5 * pi;
let uStep = 0.05;
let v1 = 0.005 * pi;
let v2 = pi / 2;
let vStep = 0.05;
let C = 2;

let vl;
let vs;
let hs;
let hl;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Constructor
function StereoCamera(
    Convergence,
    EyeSeparation,
    AspectRatio,
    FOV,
    NearClippingDistance,
    FarClippingDistance
) {
    this.mConvergence = Convergence;
    this.mEyeSeparation = EyeSeparation;
    this.mAspectRatio = AspectRatio;
    this.mFOV = FOV
    this.mNearClippingDistance = NearClippingDistance;
    this.mFarClippingDistance = FarClippingDistance;
    this.mProjectionMatrix;
    this.mModelViewMatrix;

    this.ApplyLeftFrustum = function () {
        let top, bottom, left, right;

        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        const a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;

        const b = a - this.mEyeSeparation / 2;
        const c = a + this.mEyeSeparation / 2;

        left = -b * this.mNearClippingDistance / this.mConvergence;
        right = c * this.mNearClippingDistance / this.mConvergence;

        this.mProjectionMatrix = m4.frustum(left, right, bottom, top,
            this.mNearClippingDistance, this.mFarClippingDistance)
        this.mModelViewMatrix = m4.identity()
        m4.multiply(m4.translation(0.01 * this.mEyeSeparation / 2, 0.0, 0.0), this.mModelViewMatrix, this.mModelViewMatrix);
    }

    this.ApplyRightFrustum = function () {
        let top, bottom, left, right;

        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        const a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;

        const b = a - this.mEyeSeparation / 2;
        const c = a + this.mEyeSeparation / 2;

        left = -c * this.mNearClippingDistance / this.mConvergence;
        right = b * this.mNearClippingDistance / this.mConvergence;

        this.mProjectionMatrix = m4.frustum(left, right, bottom, top,
            this.mNearClippingDistance, this.mFarClippingDistance)
        this.mModelViewMatrix = m4.identity()
        m4.multiply(m4.translation(-0.01 * this.mEyeSeparation / 2, 0.0, 0.0), this.mModelViewMatrix, this.mModelViewMatrix);
    }
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iVertexBufferOfTexCoord = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, textures) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBufferOfTexCoord);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBufferOfTexCoord);
        gl.vertexAttribPointer(shProgram.iAttribTextures, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTextures);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -5);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);
    camera.ApplyLeftFrustum()
    modelViewProjection = m4.multiply(camera.mProjectionMatrix, m4.multiply(camera.mModelViewMatrix, matAccum1));
    // modelViewProjection = m4.identity()
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.colorMask(true, false, false, false);
    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);

    camera.ApplyRightFrustum()
    modelViewProjection = m4.multiply(camera.mProjectionMatrix, m4.multiply(camera.mModelViewMatrix, matAccum1));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.colorMask(false, true, true, false);
    surface.Draw();

    gl.colorMask(true, true, true, true);
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTextures = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    camera = new StereoCamera(parseFloat(inputs[3].value), parseFloat(inputs[0].value), 1, parseFloat(inputs[1].value), parseFloat(inputs[2].value), 50)

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    inputs.push(document.getElementById('es'))
    inputs.push(document.getElementById('fov'))
    inputs.push(document.getElementById('ncd'))
    inputs.push(document.getElementById('c'))
    spans.push(document.getElementById('esSpan'))
    spans.push(document.getElementById('fovSpan'))
    spans.push(document.getElementById('ncdSpan'))
    spans.push(document.getElementById('cSpan'))
    inputs.forEach((i, ind) => {
        i.onchange = (e) => {
            // console.log(i.value)
            spans[ind].innerHTML = i.value
            camera.mEyeSeparation = parseFloat(inputs[0].value)
            camera.mFOV = parseFloat(inputs[1].value)
            camera.mNearClippingDistance = parseFloat(inputs[2].value)
            camera.mConvergence = parseFloat(inputs[3].value)
            draw()
        }
    })
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    LoadTexture()
    draw();
}

function mapRange(value, a, b, c, d) {
    // first map value from (a..b) to (0..1)
    value = (value - a) / (b - a);
    // then map it from (0..1) to (c..d) and return it
    return c + value * (d - c);
}
const multiplier = 0.5
function CreateSurfaceData() {
    let vertexes = [];
    let normals = []
    let textures = []

    let figure = (u, v) => {
        let phi = (-u / Math.sqrt(C + 1)) + Math.atan(Math.sqrt(C + 1) * Math.tan(u));
        let a = 2 / (C + 1 - (C * Math.pow(Math.sin(v), 2) * Math.pow(Math.cos(u), 2)));
        let r = (a / Math.sqrt(C)) * Math.sin(v) * Math.sqrt((C + 1) * (1 + C * Math.pow(Math.sin(u), 2)));
        return [multiplier * r * Math.cos(phi),
        multiplier * r * Math.sin(phi),
        multiplier * (Math.log(Math.tan(v / 2)) + a * (C + 1) * Math.cos(v)) / Math.sqrt(C)]
    }

    const e = 0.0001
    let analytic = (u, v) => {
        let uv1 = figure(u, v)
        let u2 = figure(u + e, v)
        let v2 = figure(u, v + e)
        const dU = [(uv1[0] - u2[0]) / e, (uv1[1] - u2[1]) / e, (uv1[2] - u2[2]) / e]
        const dV = [(uv1[0] - v2[0]) / e, (uv1[1] - v2[1]) / e, (uv1[2] - u2[2]) / e]
        return m4.normalize(m4.cross(dU, dV))
    }

    vl = 0;
    for (let u = u1; u <= u2; u += uStep) {
        vs = 0;
        for (let v = v1; v <= v2; v += vStep) {
            vertexes.push(...figure(u, v))
            vertexes.push(...figure(u + uStep, v))
            vertexes.push(...figure(u, v + vStep))
            vertexes.push(...figure(u, v + vStep))
            vertexes.push(...figure(u + uStep, v))
            vertexes.push(...figure(u + uStep, v + vStep))
            normals.push(...analytic(u, v))
            normals.push(...analytic(u + uStep, v))
            normals.push(...analytic(u, v + vStep))
            normals.push(...analytic(u, v + vStep))
            normals.push(...analytic(u + uStep, v))
            normals.push(...analytic(u + uStep, v + vStep))
            textures.push(mapRange(u, u1, u2, 0, 1), mapRange(v, v1, v2, 0, 1))
            textures.push(mapRange((u + uStep), u1, u2, 0, 1), mapRange(v, v1, v2, 0, 1))
            textures.push(mapRange(u, u1, u2, 0, 1), mapRange((v + vStep), v1, v2, 0, 1))
            textures.push(mapRange(u, u1, u2, 0, 1), mapRange((v + vStep), v1, v2, 0, 1))
            textures.push(mapRange((u + uStep), u1, u2, 0, 1), mapRange(v, v1, v2, 0, 1))
            textures.push(mapRange((u + uStep), u1, u2, 0, 1), mapRange((v + vStep), v1, v2, 0, 1))
            vs++;
            vl++;
        }
    }

    return [vertexes, textures];
}

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';
    image.src = "https://raw.githubusercontent.com/Androdroid228/lab1_vggi/PA3/funky_texture_base_036.png";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("imageLoaded")
        draw()
    }
}
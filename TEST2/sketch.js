// Physical parameters
const N = 20; // Number of oscillators (excluding fixed boundaries)
const m = 1.0; // Mass
let k = 10.0; // Spring constant (now variable)
let gamma = 0.5; // Damping constant (now variable)
let alpha = 0.0; // Non-linearity constant (cubic potential -> quadratic force)
const dt = 0.01; // Time step

// Arrays for positions, velocities, and accelerations
let x = []; // Positions (displacement from equilibrium)
let v = []; // Velocities
let a = []; // Accelerations

// Visualization parameters
let scale = 30; // Pixels per unit displacement
let offsetY = 200; // Vertical offset for oscillator display (Shifted up slightly)
let time = 0;

// UI elements
// UI elements
let dampingSlider;
let springSlider;
let amplitudeSlider;
let alphaSlider; // New slider for cubic non-linearity
let equationBoxes = []; // Array to store references to equation DOM elements

// Phase Space
let phaseSpaceCanvas;
let activePhasePlots = new Set(); // Stores indices of masses to plot
let phasePaths = {}; // Stores history for active plots: index -> [{y, v}, ...]
const MAX_PATH_LENGTH = 500;

function setup() {
    // Create canvas inside the container
    let canvas = createCanvas(1400, 550);
    canvas.parent('canvas-container');

    // Create sliders
    createSliders();

    // Create equations in DOM
    setupEquations();
    // Create theory section
    setupTheory();

    // Initialize positions and velocities
    // Fixed boundary at position 0 (x[0] = 0, always)
    // Fixed boundary at position N+1 (x[N+1] = 0, always)
    x[0] = 0; // Left fixed boundary
    v[0] = 0;

    // Initialize oscillators with triangular profile
    // Peak at index 10 (approx middle of 1-20)
    // Initialize oscillators with triangular profile
    // Peak at index 10 (approx middle of 1-20)
    let peakIndex = 10;
    let maxAmplitude = amplitudeSlider.value(); // Use slider value

    for (let i = 1; i <= N; i++) {
        if (i <= peakIndex) {
            // Linearly increasing
            x[i] = (i / peakIndex) * maxAmplitude;
        } else {
            // Linearly decreasing
            x[i] = ((N + 1 - i) / (N + 1 - peakIndex)) * maxAmplitude;
        }
        v[i] = 0.0; // Initial velocity
        a[i] = 0.0; // Initial acceleration
    }

    x[N + 1] = 0; // Right fixed boundary
    v[N + 1] = 0;
}

function createSliders() {
    // Damping slider (0 to 10)
    dampingSlider = createSlider(0, 10, 0.5, 0.1);
    dampingSlider.position(40, 120);
    dampingSlider.style('width', '250px');

    springSlider = createSlider(0, 100, 50, 1);
    springSlider.position(40, 170);
    springSlider.style('width', '250px');

    // Amplitude slider (0 to 10)
    amplitudeSlider = createSlider(0, 10, 5, 0.1);
    amplitudeSlider.position(40, 220);
    amplitudeSlider.style('width', '250px');

    // Alpha (Non-linearity) slider (-5 to 5)
    alphaSlider = createSlider(-5, 5, 0, 0.1);
    alphaSlider.position(40, 270);
    alphaSlider.style('width', '250px');
}



function setupEquations() {
    const container = document.getElementById('equations-container');
    container.innerHTML = ''; // Clear existing

    // Add general equation info at the top (full width if possible, or just first box)
    // Actually user wanted "equations to every mass" in the lower part.
    // Let's create boxes for each mass 1..N

    for (let i = 1; i <= N; i++) {
        let div = document.createElement('div');
        div.className = 'equation-box';
        div.id = `eq-box-${i}`;

        let title = document.createElement('div');
        title.className = 'equation-title';
        title.innerText = `Mass ${i}`;
        div.appendChild(title);

        let math = document.createElement('div');
        // LaTeX string - Updated for Non-Linear

        let eqString = '';
        if (i === 1) {
            // Just simplified view for mass 1 to save space or show boundary effects
            eqString = `\\[ a_1 = \\frac{F_{elas}}{m} - \\frac{\\gamma}{m}v_1 - \\frac{\\alpha}{m}y_1^2 \\]`;
        } else {
            // Generic form for i-th mass with non-linear term (simplified notation)
            // eqString = `\\[ a_{${i}} = \\frac{k}{m}\\left[ \\Delta y_R(1-\\frac{d}{L_R}) + \\Delta y_L(1-\\frac{d}{L_L}) \\right] - \\frac{\\gamma}{m}v_{${i}} - \\frac{\\alpha}{m}y_{${i}}^2 \\]`;
            eqString = `\\[ a_{${i}} \\approx \\frac{k}{m} (y_{i+1} + y_{i-1} - 2y_i) - \\frac{\\gamma}{m}v_{i} - \\frac{\\alpha}{m}y_{i}^2 \\]`;
        }

        math.innerText = eqString;
        div.appendChild(math);

        // Add Phase Space Toggle
        let toggleContainer = document.createElement('div');
        toggleContainer.style.marginTop = '5px';
        toggleContainer.style.fontSize = '0.9em';

        let checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `phase-check-${i}`;
        checkbox.onchange = (e) => togglePhasePlot(i, e.target.checked);

        let label = document.createElement('label');
        label.htmlFor = `phase-check-${i}`;
        label.innerText = ' Show Phase Space';

        toggleContainer.appendChild(checkbox);
        toggleContainer.appendChild(label);
        div.appendChild(toggleContainer);

        container.appendChild(div);
        equationBoxes[i] = div;
    }

    // Trigger MathJax typeset
    if (window.MathJax) {
        window.MathJax.typesetPromise();
    }
}

function setupTheory() {
    const container = document.getElementById('theory-container');

    let content = `
    <h2 class="theory-title">Theoretical Background & Numerical Method</h2>
    <div class="theory-content">
        <div class="theory-section">
            <h3>Lagrangian Formulation (Non-Linear)</h3>
            <p>The system consists of $N$ masses $m$ connected by springs. We introduce an on-site cubic potential $V_{nl}(y) = \\frac{1}{3}\\alpha y^3$, which leads to a quadratic force term.</p>
            $$ \\mathcal{L} = T - V_{elastic} - V_{nl} $$
            $$ F_{nl} = -\\frac{\\partial V_{nl}}{\\partial y} = -\\alpha y^2 $$
            
            <h3>Equation of Motion</h3>
            <p>Including the non-linear on-site term:</p>
            $$ m \\ddot{y}_i = F_{elastic} - \\gamma \\dot{y}_i - \\alpha y_i^2 $$
            <p>The $\\alpha y^2$ term breaks the symmetry of the potential well. If $\\alpha > 0$, the potential rises steeper for positive $y$ (stiffening) and shallower (or overturning) for negative $y$.</p>
        </div>
        
        <div class="theory-section">
            <h3>Runge-Kutta 4th Order (RK4)</h3>
            <p>We use RK4 to solve the system. The state includes position $y$ and velocity $v$.</p>
             $$ \\frac{d}{dt} \\begin{pmatrix} y \\\\ v \\end{pmatrix} = \\begin{pmatrix} v \\\\ (F_{elastic} - \\gamma v - \\alpha y^2)/m \\end{pmatrix} $$
        </div>
    </div>
    `;

    container.innerHTML = content;

    if (window.MathJax) {
        window.MathJax.typesetPromise();
    }
}

// Struct to hold state derivatives
// State is defined by arrays x (position) and v (velocity)
// Derivative is dx/dt = v, dv/dt = a
function getDerivatives(initialState) {
    let currentX = initialState.x;
    let currentV = initialState.v;

    let dx = []; // Derivative of position (velocity)
    let dv = []; // Derivative of velocity (acceleration)

    // Boundaries are fixed, derivatives are 0
    dx[0] = 0; dv[0] = 0;
    dx[N + 1] = 0; dv[N + 1] = 0;

    // Natural length of spring horizontal component (spacing)
    let d = (width - 100) / (N + 1);

    for (let i = 1; i <= N; i++) {
        // dx/dt = v
        dx[i] = currentV[i];

        // dv/dt = a
        // Calculate acceleration based on current state x and v
        let y_i = currentX[i]; // Vertical displacement
        let y_prev = currentX[i - 1];
        let y_next = currentX[i + 1];
        let v_i = currentV[i];

        let dy_next = y_next - y_i;
        let dy_prev = y_prev - y_i;

        let L_next = Math.sqrt(d * d + dy_next * dy_next);
        let L_prev = Math.sqrt(d * d + dy_prev * dy_prev);

        // Non-linear spring force from Lagrangian
        let F_spring = k * (dy_next * (1 - d / L_next) + dy_prev * (1 - d / L_prev));

        // Damping
        let dampingForce = -gamma * v_i;

        // On-site Non-Linearity (Cubic Potential -> Quadratic Force)
        let nonlinearForce = -alpha * y_i * y_i;

        dv[i] = (F_spring + dampingForce + nonlinearForce) / m;

        if (i === 10 && frameCount % 60 === 0) {
            // console.log("Mass 10: y=", y_i, " F_spring=", F_spring, " a=", dv[i], " NL=", nonlinearForce);
        }
    }

    return { dx: dx, dv: dv };
}

function updatePhysicsRK4() {
    // Current state
    let state = { x: [...x], v: [...v] };

    // K1
    let k1 = getDerivatives(state);

    // K2
    let stateK2 = { x: [], v: [] };
    for (let i = 0; i <= N + 1; i++) {
        stateK2.x[i] = state.x[i] + k1.dx[i] * dt * 0.5;
        stateK2.v[i] = state.v[i] + k1.dv[i] * dt * 0.5;
    }
    let k2 = getDerivatives(stateK2);

    // K3
    let stateK3 = { x: [], v: [] };
    for (let i = 0; i <= N + 1; i++) {
        stateK3.x[i] = state.x[i] + k2.dx[i] * dt * 0.5;
        stateK3.v[i] = state.v[i] + k2.dv[i] * dt * 0.5;
    }
    let k3 = getDerivatives(stateK3);

    // K4
    let stateK4 = { x: [], v: [] };
    for (let i = 0; i <= N + 1; i++) {
        stateK4.x[i] = state.x[i] + k3.dx[i] * dt;
        stateK4.v[i] = state.v[i] + k3.dv[i] * dt;
    }
    let k4 = getDerivatives(stateK4);

    // Update state
    for (let i = 1; i <= N; i++) {
        x[i] += (dt / 6.0) * (k1.dx[i] + 2 * k2.dx[i] + 2 * k3.dx[i] + k4.dx[i]);
        v[i] += (dt / 6.0) * (k1.dv[i] + 2 * k2.dv[i] + 2 * k3.dv[i] + k4.dv[i]);
    }
}

function draw() {
    // Update parameters from sliders
    gamma = dampingSlider.value();
    k = springSlider.value() * 1000; // Scale up for visibility at small amplitudes
    alpha = alphaSlider.value(); // Update alpha from slider

    background(20, 20, 40);

    // Update physics multiple times per frame for stability
    for (let step = 0; step < 5; step++) {
        updatePhysicsRK4();
    }

    // Draw oscillators
    drawOscillators();

    // Update equation colors
    updateEquationColors();

    time += dt * 5;
}

function updateEquationColors() {
    for (let i = 1; i <= N; i++) {
        if (equationBoxes[i]) {
            // Adjusted range for color map based on max amplitude 10
            let c = getColorFromValue(x[i], -10, 10);
            // Convert p5 color to CSS rgb string
            let r = red(c);
            let g = green(c);
            let b = blue(c);
            equationBoxes[i].style.borderLeftColor = `rgb(${r},${g},${b})`;
            // Optional: slight background tint
            equationBoxes[i].style.background = `rgba(${r},${g},${b}, 0.1)`;
        }
    }
}

function updatePhysics() {
    // Calculate accelerations for oscillators 1 through N
    // Equation of motion: m * a_i = -k(x_i - x_{i-1}) - k(x_i - x_{i+1}) - gamma * v_i
    // Simplified: a_i = -(k/m)[2*x_i - x_{i-1} - x_{i+1}] - (gamma/m)*v_i

    for (let i = 1; i <= N; i++) {
        let springForce = -k * (2 * x[i] - x[i - 1] - x[i + 1]);
        let dampingForce = -gamma * v[i];
        a[i] = (springForce + dampingForce) / m;
    }

    // Update velocities and positions using Euler method
    for (let i = 1; i <= N; i++) {
        v[i] += a[i] * dt;
        x[i] += v[i] * dt;
    }
}

function drawOscillators() {
    // Draw slider labels
    push();
    fill(255);
    textSize(14);
    textAlign(LEFT, CENTER);
    text(`Damping (γ): ${gamma.toFixed(2)}`, 310, 52);
    text(`Spring Constant (k): ${springSlider.value().toFixed(2)}`, 310, 102);
    text(`Initial Amplitude: ${amplitudeSlider.value()}`, 310, 152);
    text(`Non-Linearity (α): ${alphaSlider.value().toFixed(1)}`, 310, 202);
    pop();

    // Draw Phase Space Plots
    drawPhaseSpace();
    updatePhaseHistory();

    push();
    translate(50, offsetY);

    // Draw equilibrium line
    stroke(100, 100, 100, 50);
    strokeWeight(1);
    let spacing = (width - 100) / (N + 1);
    line(0, 0, (N + 1) * spacing, 0);

    for (let i = 0; i <= N + 1; i++) {
        let xPos = i * spacing; // Fixed horizontal position
        let yPos = -x[i] * scale; // Vertical displacement (negative for "up" being positive y)
        // Note: In p5 Canvas, Y increases downwards. If x[i] is positive "up", we draw at -y

        // Draw connection to next mass (String/Spring)
        if (i < N + 1) {
            let nextXPos = (i + 1) * spacing;
            let nextYPos = -x[i + 1] * scale;

            // Color based on slope/strain could be cool, but let's keep simple white line
            stroke(200);
            strokeWeight(2);
            line(xPos, yPos, nextXPos, nextYPos);
        }

        // Draw mass
        let massColor;
        if (i === 0 || i === N + 1) {
            massColor = color(100, 100, 100);
        } else {
            massColor = getColorFromValue(x[i], -10, 10);
        }

        fill(massColor);
        noStroke();
        circle(xPos, yPos, 15); // Slightly smaller to look like beads on a string

        // Draw mass number
        // Only draw numbers if they fit or maybe skip for clarity
        if (i > 0 && i < N + 1) {
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(8);
            text(i, xPos, yPos);
        }
    }

    pop();
}

// Blue-Purple-Red colormap
function getColorFromValue(value, minVal, maxVal) {
    // Normalize value to [0, 1]
    let t = constrain((value - minVal) / (maxVal - minVal), 0, 1);

    let r, g, b;

    if (t < 0.5) {
        // Blue to Purple (0 to 0.5)
        let localT = t * 2;
        r = lerp(0, 150, localT);
        g = lerp(100, 50, localT);
        b = lerp(255, 200, localT);
    } else {
        // Purple to Red (0.5 to 1)
        let localT = (t - 0.5) * 2;
        r = lerp(150, 255, localT);
        g = lerp(50, 50, localT);
        b = lerp(200, 50, localT);
    }

    return color(r, g, b);
}

function togglePhasePlot(index, isChecked) {
    if (isChecked) {
        activePhasePlots.add(index);
        phasePaths[index] = []; // Initialize history
    } else {
        activePhasePlots.delete(index);
        delete phasePaths[index];
    }
}

function updatePhaseHistory() {
    activePhasePlots.forEach(index => {
        if (!phasePaths[index]) phasePaths[index] = [];

        // Add current state (y, v)
        // y is x[index], v is v[index]
        phasePaths[index].push({ pos: x[index], vel: v[index] });

        // Limit path length
        if (phasePaths[index].length > MAX_PATH_LENGTH) {
            phasePaths[index].shift();
        }
    });
}

// Phase Space


// ... (rest of the file until drawPhaseSpace)

function drawPhaseSpace() {
    if (activePhasePlots.size === 0) return;

    // Create graphics buffer if it doesn't exist
    if (!phaseSpaceCanvas) {
        phaseSpaceCanvas = createGraphics(300, 200);
    }

    phaseSpaceCanvas.clear();

    // Draw background
    phaseSpaceCanvas.background(0, 0, 0, 150);
    phaseSpaceCanvas.stroke(100);
    phaseSpaceCanvas.noFill();
    phaseSpaceCanvas.rect(0, 0, 300, 200); // Border

    // Title
    phaseSpaceCanvas.noStroke();
    phaseSpaceCanvas.fill(200);
    phaseSpaceCanvas.textSize(12);
    phaseSpaceCanvas.textAlign(CENTER, TOP);
    phaseSpaceCanvas.text("Phase Space (y vs v)", 150, 5);

    // Axis center
    let centerX = 150;
    let centerY = 100;

    // Draw axes
    phaseSpaceCanvas.stroke(100);
    phaseSpaceCanvas.line(centerX, 10, centerX, 190); // Vertical V-axis
    phaseSpaceCanvas.line(10, centerY, 290, centerY); // Horizontal Y-axis

    // Scaling
    let scaleY = 15;
    let scaleV = 15;

    // Draw paths onto the buffer
    activePhasePlots.forEach(index => {
        let path = phasePaths[index];
        if (!path || path.length < 2) return;

        let c = getColorFromValue(x[index], -10, 10);
        phaseSpaceCanvas.stroke(c);
        phaseSpaceCanvas.strokeWeight(1.5);
        phaseSpaceCanvas.noFill();

        phaseSpaceCanvas.beginShape();
        for (let pt of path) {
            let px = centerX + pt.pos * scaleY;
            let py = centerY - pt.vel * scaleV;
            phaseSpaceCanvas.vertex(px, py);
        }
        phaseSpaceCanvas.endShape();

        // Draw head
        let last = path[path.length - 1];
        phaseSpaceCanvas.fill(c);
        phaseSpaceCanvas.noStroke();
        phaseSpaceCanvas.circle(centerX + last.pos * scaleY, centerY - last.vel * scaleV, 4);
    });

    // Draw the buffer onto the main canvas
    push();
    translate(550, 320);
    image(phaseSpaceCanvas, 0, 0);
    pop();
}
// Reset simulation on mouse click
function mousePressed() {
    // Ensure loop happens on canvas only to prevent resetting when clicking sliders or equations
    // Simple check: inside canvas bounds?
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        let peakIndex = 10;
        let maxAmplitude = amplitudeSlider.value();

        for (let i = 1; i <= N; i++) {
            if (i <= peakIndex) {
                x[i] = (i / peakIndex) * maxAmplitude;
            } else {
                x[i] = ((N + 1 - i) / (N + 1 - peakIndex)) * maxAmplitude;
            }
            v[i] = 0.0;
            a[i] = 0.0;
        }
        time = 0;

        // Reset phase space history
        activePhasePlots.forEach(index => {
            phasePaths[index] = [];
        });
    }
}

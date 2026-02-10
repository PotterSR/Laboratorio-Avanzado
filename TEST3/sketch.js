// Physical parameters
const N = 20; // Number of oscillators (excluding fixed boundaries)
const m = 1.0; // Mass
let k = 10.0; // Spring constant (now variable)
let gamma = 0.5; // Damping constant (now variable)
const dt = 0.01; // Time step

// Arrays for positions, velocities, and accelerations
let x = []; // Positions (displacement from equilibrium)
let v = []; // Velocities
let a = []; // Accelerations

// Visualization parameters
let scale = 30; // Pixels per unit displacement
let offsetY = 250; // Vertical offset for oscillator display
let time = 0;

// UI elements
// UI elements
let dampingSlider;
let springSlider;
let amplitudeSlider;
let temperatureSlider; // Control stochastic intensity
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
    dampingSlider.position(40, 120); // Adjusted position relative to window, but better if relative to canvas
    // Since we are using absolute positioning for p5 sliders, we might need to adjust or use .parent() 
    // but for now let's keep them absolute but adjust Y to account for the title
    dampingSlider.style('width', '250px');

    springSlider = createSlider(0, 100, 50, 1);
    springSlider.position(40, 170);
    springSlider.style('width', '250px');

    // Amplitude slider (0 to 10)
    amplitudeSlider = createSlider(0, 10, 5, 0.1);
    amplitudeSlider.position(40, 220);
    amplitudeSlider.style('width', '250px');

    // Temperature slider (0 to 10)
    temperatureSlider = createSlider(0, 10, 0, 0.1);
    temperatureSlider.position(40, 270);
    temperatureSlider.style('width', '250px');
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
            eqString = `\\[ a_1 = \\frac{F_{next} + F_{prev}}{m} - \\frac{\\gamma}{m}v_1 \\]`;
        } else {
            // Generic form for i-th mass
            eqString = `\\[ a_{${i}} = \\frac{k}{m}\\left[ \\Delta y_R(1-\\frac{d}{L_R}) + \\Delta y_L(1-\\frac{d}{L_L}) \\right] - \\frac{\\gamma}{m}v_{${i}} \\]`;
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
            <p>The system consists of $N$ masses $m$ connected by springs with constant $k$ and natural length $d$. The horizontal spacing is fixed at $d$, and masses move vertically ($y$). The Lagrangian $\\mathcal{L} = T - V$ is given by:</p>
            $$ \\mathcal{L}(y, \\dot{y}) = \\sum_{i=1}^N \\frac{1}{2}m\\dot{y}_i^2 - \\sum_{i=0}^N \\frac{1}{2}k \\left( \\sqrt{d^2 + (y_{i+1}-y_i)^2} - d \\right)^2 $$
            
            <h3>Equation of Motion</h3>
            <p>Using the Euler-Lagrange equation $\\frac{d}{dt}\\frac{\\partial \\mathcal{L}}{\\partial \\dot{y}_i} - \\frac{\\partial \\mathcal{L}}{\\partial y_i} = -\\gamma \\dot{y}_i$, we derive the exact non-linear equation of motion:</p>
            $$ m \\ddot{y}_i = k \\left[ (y_{i+1}-y_i)\\left(1 - \\frac{d}{L_{i+1}}\\right) + (y_{i-1}-y_i)\\left(1 - \\frac{d}{L_i}\\right) \\right] - \\gamma \\dot{y}_i $$
            <p>where $L_{i+1} = \\sqrt{d^2 + (y_{i+1}-y_i)^2}$ is the current length of the spring connecting mass $i$ and $i+1$.</p>
            <p><strong>Note:</strong> This non-linear system exhibits dispersion; tension depends on the extension of springs, so large amplitude waves travel faster than small ones.</p>
        </div>
        
        <div class="theory-section">
            <h3>Runge-Kutta 4th Order Integration (RK4)</h3>
            <p>We use the RK4 method to numerically solve these non-linear differential equations with high stability.</p>
             $$ \\mathbf{S}_{new} = \\mathbf{S} + \\frac{dt}{6}(k_1 + 2k_2 + 2k_3 + k_4) $$
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
// Struct to hold state derivatives
// State is defined by arrays x (position) and v (velocity)
// Derivative is dx/dt = v, dv/dt = a
function getDerivatives(initialState, noiseForces) {
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
        // F_yields_i = k * [ (y_{i+1}-y_i)*(1 - d/L_{next}) + (y_{i-1}-y_i)*(1 - d/L_{prev}) ]
        // Note: Check signs carefully.
        // Force from right (next): T_next * sin(theta_next) ~= k(L_next - d) * (y_next - y_i)/L_next
        // = k * (y_next - y_i) * (1 - d/L_next)
        // Force from left (prev): T_prev * sin(theta_prev) ~= k(L_prev - d) * (y_prev - y_i)/L_prev
        // = k * (y_prev - y_i) * (1 - d/L_prev)

        // Total spring force is sum of these two
        let F_spring = k * (dy_next * (1 - d / L_next) + dy_prev * (1 - d / L_prev));

        let dampingForce = -gamma * v_i;
        let stochasticForce = noiseForces ? noiseForces[i] : 0;
        dv[i] = (F_spring + dampingForce + stochasticForce) / m;

        if (i === 10 && frameCount % 60 === 0) {
            console.log("Mass 10: y=", y_i, " F_spring=", F_spring, " a=", dv[i], " L_next=", L_next, " d=", d);
        }
    }

    return { dx: dx, dv: dv };
}

function updatePhysicsRK4() {
    // Current state
    let state = { x: [...x], v: [...v] };

    // Generate stochastic forces (Langevin dynamics)
    // Held constant for the duration of the RK4 step
    let currentTemp = temperatureSlider.value();
    let noiseForces = [];
    // Scale noise. Real physical noise is related to gamma and T via fluctuation-dissipation theorem:
    // <F(t)F(t')> = 2*gamma*k_B*T * delta(t-t')
    // In discrete time: F_noise ~ sqrt(2*gamma*k_B*T/dt) * Gaussian(0,1)
    // For visual simulation, we just use a direct scaling factor.
    let noiseScale = currentTemp * 5.0;

    for (let i = 0; i <= N + 1; i++) {
        // Gaussian random approx using Box-Muller or just uniform for speed/simplicity
        // Uniform [-1, 1] has variance 1/3. Sum of 3 uniform gives approx Gaussian.
        // Let's use simple uniform for now, it's enough visually.
        noiseForces[i] = (Math.random() - 0.5) * noiseScale;
    }

    // K1
    let k1 = getDerivatives(state, noiseForces);

    // K2
    let stateK2 = { x: [], v: [] };
    for (let i = 0; i <= N + 1; i++) {
        stateK2.x[i] = state.x[i] + k1.dx[i] * dt * 0.5;
        stateK2.v[i] = state.v[i] + k1.dv[i] * dt * 0.5;
    }
    let k2 = getDerivatives(stateK2, noiseForces);

    // K3
    let stateK3 = { x: [], v: [] };
    for (let i = 0; i <= N + 1; i++) {
        stateK3.x[i] = state.x[i] + k2.dx[i] * dt * 0.5;
        stateK3.v[i] = state.v[i] + k2.dv[i] * dt * 0.5;
    }
    let k3 = getDerivatives(stateK3, noiseForces);

    // K4
    let stateK4 = { x: [], v: [] };
    for (let i = 0; i <= N + 1; i++) {
        stateK4.x[i] = state.x[i] + k3.dx[i] * dt;
        stateK4.v[i] = state.v[i] + k3.dv[i] * dt;
    }
    let k4 = getDerivatives(stateK4, noiseForces);

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
    text(`Temperature (Noise): ${temperatureSlider.value()}`, 310, 202);
    pop();

    // Draw Phase Space Plots
    drawPhaseSpace();
    updatePhaseHistory();

    push();

    // Clip oscillator drawing area to avoid top sliders
    // Sliders are roughly in top 280px range on the left
    // Let's protect the top 100px entirely, or just check overlaps
    // Simple approach: Clip to a rectangle starting below some margin
    // But oscillators need to go up/down. 
    // If we clip, we hide them. If we want them NOT to overlap, we should move the sliders or the simulation.
    // User asked for "drawing stays at the same place" but "fixed visual bug that rop can be over sliders".
    // This implies clipping or masking.

    // Let's clip to a region below the title/sliders for the simulation 
    // or just let them draw but mask the slider area?
    // Masking slider area:
    // We can't easily mask DOM elements from canvas.
    // But we can clip the canvas drawing to exclude the slider area.

    // Sliders are at x=40, y ~ 50-280. Width 250.
    // So region (0, 0, 350, 300) contains UI.
    // We can subtract this region from clipping? Canvas API doesn't support subtraction easily without composite ops.
    // Easier: Clip to specific rect? The simulations span the whole width.

    // Alternative: Draw a background rect behind sliders to "hide" the rope? 
    // But rope is drawn on canvas. Sliders are DOM. 
    // If rope is ON TOP of sliders, it means rope z-index is higher? 
    // No, standard p5 canvas is below DOM. 
    // The user said "rop can be over the sliders". 
    // This suggests the sliders might have `background: transparent` and the rope is visible *through* or *behind* them, 
    // making it hard to read/interact? 
    // Or maybe the rope is actually *on top* (z-index issue?).

    // If it's just visual clutter, drawing a semi-transparent background behind sliders on the canvas helps.
    // Let's draw a "UI Panel" background.

    noStroke();
    fill(20, 20, 40, 200); // Semi-transparent background matching main bg
    rect(20, 40, 300, 260, 10); // Cover slider area

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

function drawPhaseSpace() {
    if (activePhasePlots.size === 0) return;

    push();
    // Position: Below the masses (centered horizontally appx)
    translate(550, 320);

    // Draw background for plots
    fill(0, 0, 0, 150);
    stroke(100);
    rect(0, 0, 300, 200, 5);

    // Clip to this rectangle so plots don't bleed out
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(0, 0, 300, 200);
    drawingContext.clip();

    // Title
    noStroke();
    fill(200);
    textSize(12);
    textAlign(CENTER, TOP);
    text("Phase Space (y vs v)", 150, 5);

    // Axis center
    let centerX = 150;
    let centerY = 100;

    // Draw axes
    stroke(100);
    line(centerX, 10, centerX, 190); // Vertical V-axis
    line(10, centerY, 290, centerY); // Horizontal Y-axis

    // Scaling
    // Y amplitude ~ 5 -> need to fit in 140px (70px half) -> scale ~ 10
    // V amplitude ~ 5 -> need to fit in 90px (45px half) -> scale ~ 8
    let scaleY = 15;
    let scaleV = 15;

    // Draw paths
    activePhasePlots.forEach(index => {
        let path = phasePaths[index];
        if (!path || path.length < 2) return;

        // Get color for this mass
        let c = getColorFromValue(x[index], -10, 10);
        stroke(c);
        strokeWeight(1.5);
        noFill();

        beginShape();
        for (let pt of path) {
            // Plot: X-axis = Position (y), Y-axis = Velocity (v)
            let px = centerX + pt.pos * scaleY;
            let py = centerY - pt.vel * scaleV; // -v because y-down in canvas
            vertex(px, py);
        }
        endShape();

        // Draw head
        let last = path[path.length - 1];
        fill(c);
        noStroke();
        circle(centerX + last.pos * scaleY, centerY - last.vel * scaleV, 4);
    });

    drawingContext.restore();
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
        phasePaths = {}; // Clear phase space history
    }
}

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostureCam from "../components/modules/Posture";

// ─── Mock Setup ───────────────────────────────────────────────────────────────

jest.mock("react-toastify", () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockStream = {
    getTracks: jest.fn(() => [{ stop: jest.fn() }]),
};

beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
    jest.spyOn(console, "error").mockImplementation(() => { });

    global.fetch = jest.fn((url) => {
        if (url.includes("/create_session"))
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ session_id: "abc123" }),
            });
        if (url.includes("/analyze"))
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        reps: 5,
                        calories: 12,
                        angle: 90,
                        message: "Good form!",
                        fps: 10,
                        detected_label: "Push Up",
                    }),
            });
        if (url.includes("/reset_session"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    Object.defineProperty(global.navigator, "mediaDevices", {
        writable: true,
        value: {
            getUserMedia: jest.fn(() => Promise.resolve(mockStream)),
        },
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test("renders the page heading", () => {
    render(<PostureCam />);

    expect(screen.getByText(/postureai tracker/i)).toBeInTheDocument();
});

test("shows camera placeholder before tracking starts", () => {
    render(<PostureCam />);

    expect(screen.getByText(/click start to begin tracking/i)).toBeInTheDocument();
});

// test("renders workout type, detection mode and target reps controls", () => {
//     render(<PostureCam />);

//     expect(screen.getByLabelText(/workout type/i)).toBeInTheDocument();
//     expect(screen.getByLabelText(/detection mode/i)).toBeInTheDocument();
//     expect(screen.getByLabelText(/target reps/i)).toBeInTheDocument();
// });

test("shows Start Tracking button initially", () => {
    render(<PostureCam />);

    expect(screen.getByRole("button", { name: /start tracking/i })).toBeInTheDocument();
});

test("workout dropdown contains all workout options", () => {
    render(<PostureCam />);

    const workoutSelect = screen.getAllByRole("combobox")[0];
    const options = Array.from(workoutSelect.querySelectorAll("option")).map((o) => o.value);

    expect(options).toContain("Push Up");
    expect(options).toContain("Squat");
    expect(options).toContain("Plank");
    expect(options).toContain("Jumping Jack");
});

test("shows Stop Tracking and Reset buttons after starting", async () => {
    render(<PostureCam />);

    await userEvent.click(screen.getByRole("button", { name: /start tracking/i }));

    await waitFor(() =>
        expect(screen.getByRole("button", { name: /stop tracking/i })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
});

test("calls createSession with correct method on start", async () => {
    render(<PostureCam />);

    await userEvent.click(screen.getByRole("button", { name: /start tracking/i }));

    await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining("/create_session"),
            expect.objectContaining({ method: "POST" })
        )
    );
});

// test("shows camera error message when getUserMedia fails", async () => {
//     navigator.mediaDevices.getUserMedia = jest.fn(() =>
//         Promise.reject(new Error("Permission denied"))
//     );

//     render(<PostureCam />);
//     await userEvent.click(screen.getByRole("button", { name: /start tracking/i }));

//     await waitFor(() => {
//         const el = document.querySelector(".text-red-700");
//         expect(el).not.toBeNull();
//         expect(el.textContent).toMatch(/failed to access camera/i);
//     });
// });

test("returns to Start Tracking button after stopping", async () => {
    render(<PostureCam />);

    await userEvent.click(screen.getByRole("button", { name: /start tracking/i }));
    await waitFor(() =>
        expect(screen.getByRole("button", { name: /stop tracking/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /stop tracking/i }));

    await waitFor(() =>
        expect(screen.getByRole("button", { name: /start tracking/i })).toBeInTheDocument()
    );
});

test("controls are disabled while tracking is active", async () => {
    render(<PostureCam />);

    await userEvent.click(screen.getByRole("button", { name: /start tracking/i }));
    await waitFor(() =>
        expect(screen.getByRole("button", { name: /stop tracking/i })).toBeInTheDocument()
    );

    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toBeDisabled(); // Workout Type
    expect(selects[1]).toBeDisabled(); // Detection Mode
    expect(screen.getByRole("spinbutton")).toBeDisabled(); // Target Reps
});
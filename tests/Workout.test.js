import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Workout from "../components/modules/Workout";

beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test("renders today's workout tab by default", () => {
    render(<Workout />);

    expect(screen.getByText(/upper body strength/i)).toBeInTheDocument();
});

test("renders all three tab buttons", () => {
    render(<Workout />);

    expect(screen.getByRole("button", { name: /today's workout/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upcoming/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /history/i })).toBeInTheDocument();
});

test("renders all exercises for today's workout", () => {
    render(<Workout />);

    expect(screen.getByText(/bench press/i)).toBeInTheDocument();
    expect(screen.getByText(/dumbbell rows/i)).toBeInTheDocument();
    expect(screen.getByText(/plank hold/i)).toBeInTheDocument();
});

test("shows 0 completed exercises initially", () => {
    render(<Workout />);

    expect(screen.getByText(/0\/6 exercises/i)).toBeInTheDocument();
});

test("marks an exercise as complete when its button is clicked", async () => {
    render(<Workout />);

    // Each exercise has a circle button — click the first one
    const checkButtons = screen.getAllByRole("button").filter(
        (btn) => btn.className.includes("rounded-full")
    );

    await userEvent.click(checkButtons[0]);

    expect(screen.getByText(/1\/6 exercises/i)).toBeInTheDocument();
});

test("shows congratulations message when all exercises are completed", async () => {
    render(<Workout />);

    const checkButtons = screen.getAllByRole("button").filter(
        (btn) => btn.className.includes("rounded-full")
    );

    for (const btn of checkButtons) {
        await userEvent.click(btn);
    }

    expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
});

test("switches to upcoming tab and shows upcoming workouts", async () => {
    render(<Workout />);

    await userEvent.click(screen.getByRole("button", { name: /upcoming/i }));

    expect(screen.getByText(/lower body & core/i)).toBeInTheDocument();
    expect(screen.getByText(/cardio & mobility/i)).toBeInTheDocument();
    expect(screen.getByText(/full body circuit/i)).toBeInTheDocument();
});

test("expands workout details when an upcoming workout is clicked", async () => {
    render(<Workout />);

    await userEvent.click(screen.getByRole("button", { name: /upcoming/i }));
    await userEvent.click(screen.getByText(/lower body & core/i));

    expect(screen.getByText(/romanian deadlifts/i)).toBeInTheDocument();
});

test("switches to history tab and shows previous workouts", async () => {
    render(<Workout />);

    await userEvent.click(screen.getByRole("button", { name: /history/i }));

    expect(screen.getByText(/rest & recovery/i)).toBeInTheDocument();
    expect(screen.getByText(/hiit training/i)).toBeInTheDocument();
    expect(screen.getByText(/back & shoulders/i)).toBeInTheDocument();
});

test("shows completion percentage in history tab", async () => {
    render(<Workout />);

    await userEvent.click(screen.getByRole("button", { name: /history/i }));

    // Two workouts have 100%, one has 85%
    expect(screen.getAllByText("100%")).toHaveLength(2);
    expect(screen.getByText("85%")).toBeInTheDocument();
});
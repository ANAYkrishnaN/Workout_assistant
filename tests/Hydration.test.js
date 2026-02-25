import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Hydration from "../components/modules/Hydration";

// ─── Mock Setup ───────────────────────────────────────────────────────────────

jest.mock("react-toastify", () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockUser = {
    _id: "123",
    personalDetails: { age: 25, currentWeight: 70, height: 175 },
    fitnessGoals: { primaryGoal: "Lose Weight" },
    hydration: {
        currentProgress: 750,
        dailyGoal: 2500,
        workoutIntensity: "moderate",
        reminder: false,
    },
};

const setupFetch = () => {
    global.fetch = jest.fn((url) => {
        if (url.includes("/api/user/me"))
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ user: mockUser }),
            });
        if (url.includes("/api/update-hydration"))
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ user: mockUser }),
            });
        if (url.includes("/hydration/predict"))
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        recommended_intake_ml: 3000,
                        recommended_intake_liters: 3.0,
                    }),
            });
    });
};

beforeEach(() => {
    setupFetch();
    localStorage.setItem("user", JSON.stringify(mockUser));
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.spyOn(console, "log").mockImplementation(() => { });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    localStorage.clear();
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const waitForLoad = () => screen.findByText(/daily progress/i);

// ─── Tests ────────────────────────────────────────────────────────────────────

test("renders the hydration tracker after loading", async () => {
    render(<Hydration />);
    await waitForLoad();

    expect(screen.getByText(/hydration tracker/i)).toBeInTheDocument();
});

test("shows loading skeleton while fetching user data", () => {
    global.fetch = jest.fn(() => new Promise(() => { }));
    render(<Hydration />);

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
});

// Matches text split across child elements by checking the container's textContent
const getByIntake = (consumed, goal) =>
    screen.getByText((_, el) =>
        el?.textContent?.replace(/\s+/g, "") === `${consumed}ml/${goal}ml`
    );

const findByIntake = (consumed, goal) =>
    screen.findByText((_, el) =>
        el?.textContent?.replace(/\s+/g, "") === `${consumed}ml/${goal}ml`
    );

test("displays water intake and daily goal from localStorage", async () => {
    render(<Hydration />);
    await waitForLoad();

    expect(getByIntake(750, 2500)).toBeInTheDocument();
});

test("adds water when a quick add button is clicked", async () => {
    render(<Hydration />);
    await waitForLoad();

    await userEvent.click(screen.getByText("250ml"));

    // 750 + 250 = 1000ml
    await findByIntake(1000, 2500);
    expect(getByIntake(1000, 2500)).toBeInTheDocument();
});

// test("does not exceed daily goal when adding water", async () => {
//     localStorage.setItem(
//         "user",
//         JSON.stringify({
//             ...mockUser,
//             hydration: { ...mockUser.hydration, currentProgress: 2400 },
//         })
//     );

//     render(<Hydration />);
//     await waitForLoad();

//     await userEvent.click(screen.getByText("1000ml"));

//     // Should cap at 2500, not go to 3400
//     await findByIntake(2500, 2500);
//     expect(getByIntake(2500, 2500)).toBeInTheDocument();
// });

test("resets water intake to 0 when Reset Daily is clicked", async () => {
    render(<Hydration />);
    await waitForLoad();

    await userEvent.click(screen.getByRole("button", { name: /reset daily/i }));

    await findByIntake(0, 2500);
    expect(getByIntake(0, 2500)).toBeInTheDocument();
});

test("shows validation toast when predicting with missing fields", async () => {
    const { toast } = require("react-toastify");
    localStorage.clear();

    render(<Hydration />);
    await waitForLoad();

    await userEvent.click(
        screen.getByRole("button", { name: /calculate optimal hydration/i })
    );

    expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining("Please fill in all required fields")
    );
});

// test("shows ML prediction result after successful calculation", async () => {
//     render(<Hydration />);
//     await waitForLoad();

//     const autoInputs = screen.getAllByPlaceholderText(/auto from weather/i);
//     await userEvent.type(autoInputs[0], "25");
//     await userEvent.type(autoInputs[1], "60");

//     await userEvent.selectOptions(screen.getByDisplayValue(/select season/i), "Summer");

//     // Selects in order: Season, Workout Goal, Workout Intensity — so goal is second-to-last
//     const allSelects = screen.getAllByRole("combobox");
//     const workoutGoalSelect = allSelects[allSelects.length - 2];
//     await userEvent.selectOptions(workoutGoalSelect, "Lose Weight");

//     await userEvent.click(
//         screen.getByRole("button", { name: /calculate optimal hydration/i })
//     );

//     await screen.findByText(/3000ml/i);
//     expect(screen.getByText(/3000ml/i)).toBeInTheDocument();
// });

test("toggles reminders on and off", async () => {
    render(<Hydration />);
    await waitForLoad();

    const reminderButton = screen.getByRole("button", { name: "Off" });
    await userEvent.click(reminderButton);

    expect(screen.getByRole("button", { name: "On" })).toBeInTheDocument();
});

test("displays the AI hydration tip", async () => {
    render(<Hydration />);
    await waitForLoad();

    expect(screen.getByText(/ai hydration tip/i)).toBeInTheDocument();
});
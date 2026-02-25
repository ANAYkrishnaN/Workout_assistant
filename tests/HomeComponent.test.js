import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DietPlanner from "../components/modules/DietPlanner";

// ─── Mock Setup ───────────────────────────────────────────────────────────────

jest.mock("react-toastify", () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockUser = {
    _id: "123",
    personalDetails: {
        gender: "Male",
        fitnessGoal: "Weight Loss",
        currentWeight: 70,
        height: 170,
    },
};

const mockDietResult = {
    gender: "Male",
    goal: "Lose Weight",
    bmi: 24.2,
    bmi_category: "Normal",
    meal_plan_category: "Low Calorie",
    calories: 1800,
    protein: 140,
    meal_plan_details:
        "Breakfast: Eggs | Lunch: Chicken salad | Dinner: Salmon | Snack: Apple | Total: 1800 cal, 140g protein",
};

global.fetch = jest.fn((url) => {
    if (url.includes("/api/users/me"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, user: mockUser }) });
    if (url.includes("/diet/info"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ genders: ["Male", "Female"], goals: ["Lose Weight", "Build Muscle"] }) });
    if (url.includes("/diet/predict"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDietResult) });
});

beforeEach(() => {
    localStorage.setItem("user", JSON.stringify(mockUser));
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
    jest.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    localStorage.clear();
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const getGenderSelect = () => screen.getAllByRole("combobox")[0];
const getGoalSelect = () => screen.getAllByRole("combobox")[1];

const fillAndSubmit = async () => {
    await userEvent.selectOptions(getGenderSelect(), "Male");
    await userEvent.selectOptions(getGoalSelect(), "Lose Weight");
    await userEvent.click(screen.getByRole("button", { name: /generate diet plan/i }));
};

// ─── Tests ────────────────────────────────────────────────────────────────────

test("renders the page after loading", async () => {
    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);
    expect(screen.getByText(/diet planner/i)).toBeInTheDocument();
});

// test("pre-fills weight and height fields from localStorage", async () => {
//     render(<DietPlanner />);
//     await screen.findByText(/diet planner/i);

//     expect(screen.getByPlaceholderText(/enter your weight/i)).toHaveValue(70);
//     expect(screen.getByPlaceholderText(/enter your height/i)).toHaveValue(170);
// });

// test("shows validation message when submitting empty form", async () => {
//     localStorage.clear();
//     const { toast } = require("react-toastify");

//     render(<DietPlanner />);
//     await screen.findByText(/diet planner/i);

//     await userEvent.click(screen.getByRole("button", { name: /generate diet plan/i }));

//     expect(toast.info).toHaveBeenCalledWith("Please fill in all fields");
// });

// test("shows results after submitting the form", async () => {
//     render(<DietPlanner />);
//     await screen.findByText(/diet planner/i);

//     await fillAndSubmit();

//     await screen.findByText(/your health metrics/i);
//     expect(screen.getByText("24.2")).toBeInTheDocument();
//     expect(screen.getByText(/low calorie/i)).toBeInTheDocument();
//     expect(screen.getByText(/breakfast:/i)).toBeInTheDocument();
// });

// test("hides results after clicking Reset", async () => {
//     render(<DietPlanner />);
//     await screen.findByText(/diet planner/i);

//     await fillAndSubmit();
//     await screen.findByText(/your health metrics/i);

//     await userEvent.click(screen.getByRole("button", { name: /reset/i }));

//     await waitFor(() =>
//         expect(screen.queryByText(/your health metrics/i)).not.toBeInTheDocument()
//     );
// });

// test("does not show results when API returns an error", async () => {
//     fetch.mockImplementation((url) => {
//         if (url.includes("/diet/predict"))
//             return Promise.resolve({ ok: false, json: () => Promise.resolve({ detail: "Server error" }) });
//         if (url.includes("/api/users/me"))
//             return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, user: mockUser }) });
//         if (url.includes("/diet/info"))
//             return Promise.resolve({ ok: true, json: () => Promise.resolve({ genders: ["Male", "Female"], goals: ["Lose Weight", "Build Muscle"] }) });
//     });

//     render(<DietPlanner />);
//     await screen.findByText(/diet planner/i);

//     await fillAndSubmit();

//     await waitFor(() =>
//         expect(screen.queryByText(/your health metrics/i)).not.toBeInTheDocument()
//     );
// });
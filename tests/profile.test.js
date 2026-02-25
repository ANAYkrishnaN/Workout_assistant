import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserProfile from "../pages/profile";

// ─── Mock Next.js App Router ───────────────────────────────────────

jest.mock("next/router", () => ({
    useRouter: () => ({
        push: jest.fn(),
        prefetch: jest.fn(),
        pathname: "/profile",
        query: {},
        asPath: "/profile",
    }),
}));
// ─── Mock Data ─────────────────────────────────────────────────────

const mockUser = {
    _id: "123",
    login: { fullName: "Jane Doe", email: "jane@example.com" },
    personalDetails: {
        age: 28,
        gender: "Female",
        height: 65,
        currentWeight: 140,
        targetWeight: 130,
    },
    fitnessGoals: {
        primaryGoal: "Lose weight",
        fitnessLevel: "Intermediate",
        availableEquipment: ["Full gym"],
        injuries: [],
    },
    schedule: {
        workoutDaysPerWeek: 4,
        timePerWorkout: 45,
    },
    progress: {
        workoutsCompleted: 12,
        caloriesBurned: 2400,
    },
    createdAt: "2024-01-15T00:00:00.000Z",
};

// ─── Test Setup ────────────────────────────────────────────────────

beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.spyOn(console, "log").mockImplementation(() => { });

    localStorage.setItem("user", JSON.stringify({ _id: "123" }));

    global.fetch = jest.fn((url, options) => {
        if (options?.method === "PUT") {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });
        }

        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, user: mockUser }),
        });
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    localStorage.clear();
});

// ─── Helper ────────────────────────────────────────────────────────

const waitForLoad = () =>
    screen.findByRole("heading", { name: "Jane Doe" });

// ─── Tests ─────────────────────────────────────────────────────────

test("shows loading spinner while fetching profile", async () => {
    global.fetch = jest.fn(() => new Promise(() => { }));
    render(<UserProfile />);

    expect(await screen.findByText(/loading profile/i)).toBeInTheDocument();
});

test("renders user name and profile after loading", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
});

test("renders fitness level and days per week badges", async () => {
    render(<UserProfile />);
    await waitForLoad();

    const badges = screen.getAllByText("Intermediate");
    expect(badges[0]).toBeInTheDocument();
    expect(screen.getByText(/4 days\/week/i)).toBeInTheDocument();
});

test("renders quick stats from user data", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getByText("140")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
});

test("shows Edit Profile button initially", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
});

test("switches to editing mode when Edit Profile is clicked", async () => {
    render(<UserProfile />);
    await waitForLoad();

    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
});

test("cancels editing and restores original values", async () => {
    render(<UserProfile />);
    await waitForLoad();

    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    const nameInput = screen.getAllByRole("textbox")[0];
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Changed Name");

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
});

test("calls PUT API with updated data when Save is clicked", async () => {
    render(<UserProfile />);
    await waitForLoad();

    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
            "/api/users/me",
            expect.objectContaining({ method: "PUT" })
        )
    );
});

test("shows error message when profile fails to load", async () => {
    localStorage.setItem("user", JSON.stringify({ _id: "123" }));

    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Not found" }),
        })
    );

    render(<UserProfile />);

    expect(await screen.findByText(/error loading profile/i)).toBeInTheDocument();
});

test("calculates and displays weekly commitment minutes", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getByText("180")).toBeInTheDocument();
});
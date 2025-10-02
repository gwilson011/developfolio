// Custom hooks for grouping related state in meal planning components

import { useState, useEffect } from 'react';
import { MEAL_PLAN_CONFIG, DEFAULTS } from '../config/meal-plan';
import { MealData, ParsedRecipeData, PlanSummary, MealPlan } from '@/app/types/recipe';

// Meal planning configuration state
export interface MealPlanConfig {
    dailyCalories: number;
    weekStart: string;
    newPlan: boolean;
    todaySelected: boolean;
    instructions: string;
}

export function useMealPlanConfig() {
    const [config, setConfig] = useState<MealPlanConfig>({
        dailyCalories: DEFAULTS.daily_calories,
        weekStart: "",
        newPlan: DEFAULTS.new_plan_mode,
        todaySelected: false,
        instructions: "",
    });

    const updateConfig = (updates: Partial<MealPlanConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    return {
        // Spread individual config properties
        ...config,
        // Keep the config object for grouped access with renamed property
        configState: config,
        updateConfig,
        setDailyCalories: (calories: number) => updateConfig({ dailyCalories: calories }),
        setWeekStart: (start: string) => updateConfig({ weekStart: start }),
        setNewPlan: (newPlan: boolean) => updateConfig({ newPlan }),
        setTodaySelected: (selected: boolean) => updateConfig({ todaySelected: selected }),
        setInstructions: (instructions: string) => updateConfig({ instructions }),
    };
}

// Travel and eating out state
export interface TravelState {
    outOfTown: number;
    daysOutOfTown: boolean[];
    eatOut: number;
    mealsOut: { breakfast: boolean; lunch: boolean; dinner: boolean }[];
}

export function useTravelState() {
    const [travel, setTravel] = useState<TravelState>({
        outOfTown: 0,
        daysOutOfTown: Array(7).fill(false),
        eatOut: 0,
        mealsOut: Array(7).fill(null).map(() => ({
            breakfast: false,
            lunch: false,
            dinner: false
        })),
    });

    const updateTravel = (updates: Partial<TravelState>) => {
        setTravel(prev => ({ ...prev, ...updates }));
    };

    return {
        // Spread individual travel properties
        ...travel,
        // Keep the travel object for grouped access with renamed property
        travelStates: travel,
        updateTravel,
        setOutOfTown: (days: number) => updateTravel({ outOfTown: days }),
        setDaysOutOfTown: (days: boolean[]) => updateTravel({ daysOutOfTown: days }),
        setEatOut: (meals: number) => updateTravel({ eatOut: meals }),
        setMealsOut: (meals: { breakfast: boolean; lunch: boolean; dinner: boolean }[]) =>
            updateTravel({ mealsOut: meals }),
    };
}

// UI state for forms and modals
export interface UIState {
    addInstructions: boolean;
    selectKnownMeals: boolean;
    showInstagramImport: boolean;
    showScreenshotImport: boolean;
}

export function useUIState() {
    const [ui, setUI] = useState<UIState>({
        addInstructions: false,
        selectKnownMeals: false,
        showInstagramImport: false,
        showScreenshotImport: false,
    });

    const updateUI = (updates: Partial<UIState>) => {
        setUI(prev => ({ ...prev, ...updates }));
    };

    return {
        // Spread individual UI properties
        ...ui,
        // Keep the ui object for grouped access with renamed property
        uiStates: ui,
        updateUI,
        setAddInstructions: (show: boolean) => updateUI({ addInstructions: show }),
        setSelectKnownMeals: (show: boolean) => updateUI({ selectKnownMeals: show }),
        setShowInstagramImport: (show: boolean) => updateUI({ showInstagramImport: show }),
        setShowScreenshotImport: (show: boolean) => updateUI({ showScreenshotImport: show }),
    };
}

// Loading states
export interface LoadingState {
    loading: boolean;
    loadingKnownMeals: boolean;
    loadingPreviousPlans: boolean;
    loadingPlanWeek: string | null;
    importingRecipe: boolean;
    processingScreenshot: boolean;
    savingRecipe: boolean;
}

export function useLoadingState() {
    const [loading, setLoadingStates] = useState<LoadingState>({
        loading: false,
        loadingKnownMeals: false,
        loadingPreviousPlans: false,
        loadingPlanWeek: null,
        importingRecipe: false,
        processingScreenshot: false,
        savingRecipe: false,
    });

    const updateLoading = (updates: Partial<LoadingState>) => {
        setLoadingStates(prev => ({ ...prev, ...updates }));
    };

    return {
        // Spread individual loading states
        ...loading,
        // Keep the loading object for grouped access with renamed property
        loadingStates: loading,
        updateLoading,
        setLoading: (isLoading: boolean) => updateLoading({ loading: isLoading }),
        setLoadingKnownMeals: (isLoading: boolean) => updateLoading({ loadingKnownMeals: isLoading }),
        setLoadingPreviousPlans: (isLoading: boolean) => updateLoading({ loadingPreviousPlans: isLoading }),
        setLoadingPlanWeek: (week: string | null) => updateLoading({ loadingPlanWeek: week }),
        setImportingRecipe: (importing: boolean) => updateLoading({ importingRecipe: importing }),
        setProcessingScreenshot: (processing: boolean) => updateLoading({ processingScreenshot: processing }),
        setSavingRecipe: (saving: boolean) => updateLoading({ savingRecipe: saving }),
    };
}

// Data state for plans, meals, and recipes
export interface DataState {
    plan: Partial<MealPlan> | null;
    knownMeals: MealData[];
    previousPlans: PlanSummary[];
    selectedKnownMeals: Set<string>;
    parsedRecipe: ParsedRecipeData | null;
    uploadedImage: File | null;
    instagramUrl: string;
    prefs: { vegetarian: boolean; dislikes: string };
}

export function useDataState() {
    const [data, setDataState] = useState<DataState>({
        plan: null,
        knownMeals: [],
        previousPlans: [],
        selectedKnownMeals: new Set<string>(),
        parsedRecipe: null,
        uploadedImage: null,
        instagramUrl: "",
        prefs: { vegetarian: DEFAULTS.vegetarian, dislikes: DEFAULTS.dislikes },
    });

    const updateData = (updates: Partial<DataState>) => {
        setDataState(prev => ({ ...prev, ...updates }));
    };

    return {
        // Spread individual data properties
        ...data,
        // Keep the data object for grouped access with renamed property
        dataStates: data,
        updateData,
        setPlan: (plan: Partial<MealPlan> | null) => updateData({ plan }),
        setKnownMeals: (meals: MealData[]) => updateData({ knownMeals: meals }),
        setPreviousPlans: (plans: PlanSummary[]) => updateData({ previousPlans: plans }),
        setSelectedKnownMeals: (selected: Set<string>) => updateData({ selectedKnownMeals: selected }),
        setParsedRecipe: (recipe: ParsedRecipeData | null) => updateData({ parsedRecipe: recipe }),
        setUploadedImage: (image: File | null) => updateData({ uploadedImage: image }),
        setInstagramUrl: (url: string) => updateData({ instagramUrl: url }),
        setPrefs: (prefs: { vegetarian: boolean; dislikes: string }) => updateData({ prefs }),
    };
}

// Filter state for meal selection
export interface FilterState {
    searchTerm: string;
    maxCalories: number;
    selectedMealType: string;
    selectedTag: string;
}

export function useFilterState() {
    const [filters, setFilters] = useState<FilterState>({
        searchTerm: "",
        maxCalories: MEAL_PLAN_CONFIG.UI.default_calorie_filter,
        selectedMealType: "All",
        selectedTag: "All",
    });

    const updateFilters = (updates: Partial<FilterState>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    };

    return {
        // Spread individual filter properties
        ...filters,
        // Keep the filters object for grouped access with renamed property
        filterStates: filters,
        updateFilters,
        setSearchTerm: (term: string) => updateFilters({ searchTerm: term }),
        setMaxCalories: (calories: number) => updateFilters({ maxCalories: calories }),
        setSelectedMealType: (type: string) => updateFilters({ selectedMealType: type }),
        setSelectedTag: (tag: string) => updateFilters({ selectedTag: tag }),
    };
}

// Combined hook for meal planning page
export function useMealPlanningState() {
    const mealPlanConfig = useMealPlanConfig();
    const travelState = useTravelState();
    const uiState = useUIState();
    const loadingState = useLoadingState();
    const dataState = useDataState();
    const filterState = useFilterState();

    return {
        ...mealPlanConfig,
        ...travelState,
        ...uiState,
        ...loadingState,
        ...dataState,
        ...filterState,
    };
}

// Custom hook for fetching initial data
export function useInitialData() {
    const { setKnownMeals, setPlan } = useDataState();

    useEffect(() => {
        // Fetch latest plan from Notion
        const fetchInitialData = async () => {
            try {
                const response = await fetch(`/api/notion/latest?t=${Date.now()}`);
                const data = await response.json();
                console.log("Fetched latest plan from Notion:", data);

                if (data.plan) {
                    setPlan(data.plan);
                }
                if (data.knownMeals && data.knownMeals.length > 0) {
                    setKnownMeals(data.knownMeals);
                }
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };

        fetchInitialData();
    }, [setPlan, setKnownMeals]);
}
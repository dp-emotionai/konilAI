import { api } from "@/lib/api/client";

export type TestQuestionType = "single_choice" | "multiple_choice" | "text";
export type TestStatus = "draft" | "published" | "closed";

export type TestOptionPayload = {
    text: string;
    isCorrect?: boolean;
    order?: number;
    imageStorageKey?: string | null;
};

export type TestQuestionPayload = {
    type: TestQuestionType;
    text: string;
    points?: number;
    order?: number;
    explanation?: string | null;
    imageStorageKey?: string | null;
    options?: TestOptionPayload[];
};

export type Test = {
    id: string;
    title: string;
    description?: string | null;
    groupId?: string | null;
    sessionId?: string | null;
    status: TestStatus;
    timeLimitMinutes?: number | null;
    attemptsAllowed?: number | null;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    questions?: TestQuestion[];
};

export type TestQuestion = {
    id: string;
    testId: string;
    type: TestQuestionType;
    text: string;
    points: number;
    order: number;
    explanation?: string | null;
    options: TestOption[];
};

export type TestOption = {
    id: string;
    questionId: string;
    text?: string | null;
    isCorrect?: boolean;
    order: number;
};

export type CreateTestPayload = {
    title: string;
    description?: string | null;
    groupId?: string | null;
    sessionId?: string | null;
    timeLimitMinutes?: number | null;
    attemptsAllowed?: number | null;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
};

export async function createTest(payload: CreateTestPayload): Promise<Test> {
    return api.post<Test>("/tests", payload);
}

export async function addTestQuestion(
    testId: string,
    payload: TestQuestionPayload
): Promise<TestQuestion> {
    return api.post<TestQuestion>(`/tests/${testId}/questions`, payload);
}

export async function publishTest(testId: string): Promise<Test> {
    return api.post<Test>(`/tests/${testId}/publish`);
}
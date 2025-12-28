export type Quantizations =
    | 'int4'
    | 'int8'
    | 'fp6'
    | 'fp8'
    | 'fp16'
    | 'bf16'
    | 'unknown';

export type ResponseFormatTypes = "string" | "number" | "boolean";
export type ResponseFormatObject = {
    type: "object";
    properties: Record<string, {
        type: ResponseFormatTypes | ResponseFormatTypes[];
        description?: string;
        enum?: any[];
    }>;
    required?: string[];
    additionalProperties?: boolean;
};

export type ResponseFormatArray = {
    type: "array";
    items: ResponseFormatObject | ResponseFormatArray;
};

export type Plugin = ({
    id: 'file-parser',
    pdf: {
        engine: "mistral-ocr" | "pdf-text" | "native"
    },
} | {
    id: "web",
    engine?: "exa" | "native",
    max_results: number,
    search_prompt: string
} | { id: "response-healing" })

export type ImageConfigAspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";
export type ImageConfigImageSize = "1K" | "2K" | "4K";

export type ReasoningEffort = "high" | "medium" | "low"
export type ProviderDataCollection = 'allow' | 'deny'
export type WebSearchOptionsContextSize = "low" | "med" | "high"

export type Config = {
    //Headers
    httpReferer?: string;
    xTitle?: string;

    //Actual config
    // Docs for reasoning: https://openrouter.ai/docs/use-cases/reasoning-tokens
    reasoning?: {
        exclude?: boolean,
        enabled?: boolean
    } & ({
        effort?: ReasoningEffort
    } | {
        max_tokens?: number
    })

    response_format?: { type: 'json_object' } | {
        type: 'json_schema';
        json_schema: {
            name: string;
            strict: boolean;
            schema: ResponseFormatObject | ResponseFormatArray;
        };
    };

    // https://openrouter.ai/docs/provider-routing
    provider?: {
        only?: string[];
        order?: string[];
        ignore?: string[];
        quantizations?: Quantizations[];
        data_collection?: ProviderDataCollection;
        allow_fallbacks?: boolean;
        require_parameters?: boolean;
        enforce_distillable_text?: boolean;
    };
    user?: string; // A stable identifier for your end-users. Used to help detect and prevent abuse.

    stop?: string | string[];

    min_p?: number // Range: (0, 1]

    // See LLM Parameters (openrouter.ai/docs/parameters)
    max_tokens?: number; // Range: [1, context_length)
    temperature?: number; // Range: [0, 2]
    top_a?: number; // Range: [0, 1]
    top_p?: number; // Range: (0, 1]
    top_k?: number; // Range: [1, Infinity) Not available for OpenAI models
    frequency_penalty?: number; // Range: [-2, 2]
    presence_penalty?: number; // Range: [-2, 2]
    repetition_penalty?: number; // Range: (0, 2]
    seed?: number; // OpenAI only

    logit_bias?: { [key: number]: number };

    tools?: Tool[];
    tool_choice?: ToolChoice;

    //OpenRouter only. Will not be passed to providers
    //openrouter.ai/docs/transforms
    transforms?: ['middle-out'] | [];

    // Reduce latency by providing the model with a predicted output
    // https://platform.openai.com/docs/guides/latency-optimization#use-predicted-outputs
    prediction?: { type: 'content'; content: string };

    plugins?: Plugin[];
    web_search_options?: {
        search_context_size: WebSearchOptionsContextSize
    };

    // Image gen only
    modalities?: ['image', 'text'],

    // Google image models only
    image_config?: {
        aspect_ratio: ImageConfigAspectRatio,
        image_size: ImageConfigImageSize
    }

    debug?: {
        echo_upstream_body?: boolean; // If true, returns the transformed request body sent to the provider
    };
} & ({
    // Docs: openrouter.ai/docs/model-routing
    models: string[];
    route: 'fallback';
} | {
    model?: string;
    route?: undefined;
})

export type FunctionDescription = {
    description?: string;
    name: string;
    parameters: object; // JSON Schema object
};

export type Tool = {
    type: 'function';
    function: FunctionDescription;
};

export type ToolChoice =
    | 'none'
    | 'auto'
    | {
        type: 'function';
        function: {
            name: string;
        };
    };

export type VerboseContentInputAudioFormat = "wav" | "mp3" | "aiff" | "aac" | "ogg" | "flac" | "m4a" | "pcm16" | "pcm24"

export type VerboseContent =
    { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
    | { type: "file", file: { filename: string, file_data: string } }
    | {
        type: "input_audio",
        inputAudio: {
            data: string,
            format: VerboseContentInputAudioFormat
        }
    }
    | {
        type: "video_url",
        videoUrl: {
            url: string
        },
    }
    | {
        type: 'file',
        file: {
            filename: string,
            fileData: string,
        },
    };

export type MessageRole = 'system' | 'user' | 'assistant'
export type Message = {
    role: MessageRole;
    content: string | VerboseContent[];
}

export type Error = {
    code: number; // See "Error Handling" section
    message: string;
};

export type FunctionCall = {
    name: string;
    arguments: string; // JSON format arguments
};

export type ToolCall = {
    id: string;
    type: 'function';
    function: FunctionCall;
};

export type ResponseChoiceNonStreamingImage =
    {
        type: "image_url",
        image_url: {
            url: string
        }
    };

export interface ResponseChoiceNonStreaming {
    finish_reason: string | null; // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call'
    message: {
        content: string | null;
        role: string;
        reasoning: string | null;
        tool_calls?: ToolCall[];
        images?: ResponseChoiceNonStreamingImage[]
    };
    error?: Error;
}

export interface ResponseUsage {
    /** Including images and tools if any */
    prompt_tokens: number;
    /** The tokens generated */
    completion_tokens: number;
    /** Sum of the above two fields */
    total_tokens: number;
}

export interface ResponseSuccess {
    id: string;

    choices: ResponseChoiceNonStreaming[];
    created: number; // Unix timestamp
    model: string;

    system_fingerprint?: string; // Only present if the provider supports it
    usage?: ResponseUsage;
}

export interface ResponseError {
    error: {
        status: number;
        message: string;
        metadata?: unknown;
    };
}

export interface GenerationStats {
    data: {
        id: string;
        model: string;
        streamed: false;
        generation_time: number;
        created_at: Date;
        tokens_prompt: number;
        tokens_completion: number;
        native_tokens_prompt: number;
        native_tokens_completion: number;
        num_media_prompt: null;
        num_media_completion: null;
        origin: string;
        total_cost: number;
        cache_discount: null;
    };
}
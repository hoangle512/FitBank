# Magentic-UI

This project provides a set of Python classes and functions to interact with Google's Gemini large language models. It includes features for making both synchronous and asynchronous calls, handling parallel requests, and converting between Gemini and JSON schemas.

## Key Technologies:

*   **Language:** Python
*   **Google AI Services:** Gemini API, Vertex AI

## Features

*   **`GeminiModel` Class**: A synchronous client for the Gemini API with features like:
    *   Retry logic with exponential backoff.
    *   Parallel execution of multiple prompts using a thread pool.
    *   Caching of model responses.
    *   Request distribution across multiple regions.
*   **`Gemini` Class**: An asynchronous client that integrates with a larger LLM framework (inherits from `BaseLlm`). It supports:
    *   Streaming responses.
    *   Async generation of content.
    *   Automatic detection of Vertex AI or Gemini API backend.
    *   Bidi connections for live sessions.
*   **Schema Conversion**: Utility functions to convert between Gemini's `Schema` object and standard JSON Schema.
    *   `gemini_to_json_schema`
    *   `_to_gemini_schema`

## Code Overview

### `GeminiModel`

The `GeminiModel` class provides a simple interface for calling the Gemini models.

```python
class GeminiModel:
    """Class for the Gemini model."""

    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-001",
        finetuned_model: bool = False,
        distribute_requests: bool = False,
        cache_name: str | None = None,
        temperature: float = 0.01,
        **kwargs,
    ):
        # ...

    @retry(max_attempts=12, base_delay=2, backoff_factor=2)
    def call(self, prompt: str, parser_func=None) -> str:
        # ...

    def call_parallel(
        self,
        prompts: List[str],
        parser_func: Optional[Callable[[str], str]] = None,
        timeout: int = 60,
        max_retries: int = 5,
    ) -> List[Optional[str]]:
        # ...
```

### `Gemini` (Async)

The `Gemini` class is designed for asynchronous applications.

```python
class Gemini(BaseLlm):
  """Integration for Gemini models."""

  model: str = 'gemini-1.5-flash'

  async def generate_content_async(
      self, llm_request: LlmRequest, stream: bool = False
  ) -> AsyncGenerator[LlmResponse, None]:
      # ...
```

### Schema Conversion

The project includes functions to convert between Gemini and JSON schemas.

```python
def gemini_to_json_schema(gemini_schema: Schema) -> Dict[str, Any]:
  """Converts a Gemini Schema object into a JSON Schema dictionary."""
  # ...

def _to_gemini_schema(openapi_schema: dict[str, Any]) -> Schema:
  """Converts an OpenAPI schema dictionary to a Gemini Schema object."""
  # ...
```
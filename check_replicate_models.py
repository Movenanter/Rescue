"""
Check available vision models on Replicate for CPR analysis
"""

# Popular vision models available on Replicate (as of 2024):

VISION_MODELS = {
    "llava": {
        "model_id": "yorickvp/llava-13b:80537f9e",  # LLaVA - Large Language and Vision Assistant
        "description": "Multimodal model that can understand images and answer questions about them",
        "use_case": "Good for detailed image analysis with natural language responses"
    },
    "llava-v1.6": {
        "model_id": "yorickvp/llava-v1.6-mistral-7b:19be067b",
        "description": "Updated LLaVA with better performance",
        "use_case": "Improved accuracy for spatial understanding"
    },
    "blip": {
        "model_id": "salesforce/blip:2e1dddc8",
        "description": "BLIP - Bootstrapping Language-Image Pre-training",
        "use_case": "Good for image captioning and visual question answering"
    },
    "blip-2": {
        "model_id": "andreasjansson/blip-2:4b32258",
        "description": "BLIP-2 - More advanced version with better understanding",
        "use_case": "Better at complex visual reasoning"
    },
    "cogvlm": {
        "model_id": "daanelson/cogvlm:4f5e37bd",
        "description": "CogVLM - Powerful vision language model",
        "use_case": "State-of-the-art visual understanding"
    },
    "minigpt4": {
        "model_id": "daanelson/minigpt-4:b96a2f33",
        "description": "MiniGPT-4 - Enhances vision-language understanding",
        "use_case": "Good for detailed visual descriptions"
    },
    "moondream2": {
        "model_id": "lucataco/moondream2:392a53ac",
        "description": "Moondream2 - Tiny but powerful vision language model",
        "use_case": "Fast, efficient for basic visual tasks"
    },
    "gpt4-vision": {
        "model_id": "andreasjansson/gpt-4-vision-preview:80537f9e",
        "description": "GPT-4 Vision API wrapper (requires OpenAI key)",
        "use_case": "Most powerful but requires additional API key"
    }
}

# For CPR analysis, best options are likely:
# 1. llava-v1.6 - Good spatial understanding for hand positioning
# 2. cogvlm - Most powerful open model
# 3. blip-2 - Good balance of speed and accuracy

print("Available Vision Models on Replicate for CPR Analysis:")
print("=" * 60)
for name, info in VISION_MODELS.items():
    print(f"\n{name.upper()}:")
    print(f"  Model: {info['model_id']}")
    print(f"  Description: {info['description']}")
    print(f"  Use Case: {info['use_case']}")

print("\n" + "=" * 60)
print("\nRecommended for CPR Analysis:")
print("1. llava-v1.6-mistral-7b - Best for understanding body positioning")
print("2. cogvlm - Most accurate for complex visual analysis")
print("3. blip-2 - Fast and reliable for basic position checks")
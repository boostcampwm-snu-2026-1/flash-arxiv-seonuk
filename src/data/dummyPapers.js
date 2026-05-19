export const dummyPapers = [
  {
    id: "2405.12345",
    title: "Scaling Diffusion Transformers for High-Resolution Image Synthesis",
    authors: ["Ji Lin", "Ligeng Zhu", "Song Han"],
    date: "2026-05-19",
    abstract:
      "We present a scalable diffusion transformer architecture that achieves state-of-the-art results on high-resolution image synthesis benchmarks. By introducing adaptive layer normalization and efficient attention mechanisms, our model generates 1024×1024 images with significantly reduced computational cost compared to previous approaches.",
    tags: ["diffusion models", "transformers", "image synthesis"],
    url: "https://arxiv.org/abs/2405.12345",
  },
  {
    id: "2405.11982",
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    authors: ["Jason Wei", "Xuezhi Wang", "Dale Schuurmans", "Maarten Bosma", "Brian Ichter"],
    date: "2026-05-18",
    abstract:
      "We explore how generating a chain of thought — a series of intermediate reasoning steps — significantly improves the ability of large language models to perform complex reasoning. Experiments on arithmetic, commonsense, and symbolic reasoning benchmarks demonstrate substantial gains over standard few-shot prompting.",
    tags: ["LLM", "reasoning", "prompting"],
    url: "https://arxiv.org/abs/2405.11982",
  },
  {
    id: "2405.10741",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: ["Patrick Lewis", "Ethan Perez", "Aleksandra Piktus"],
    date: "2026-05-16",
    abstract:
      "We introduce Retrieval-Augmented Generation (RAG), a technique that combines pre-trained parametric memory with non-parametric memory in the form of a dense vector index. RAG models achieve state-of-the-art results on knowledge-intensive tasks while remaining updateable without full retraining.",
    tags: ["RAG", "NLP", "knowledge retrieval"],
    url: "https://arxiv.org/abs/2405.10741",
  },
  {
    id: "2405.09033",
    title: "Vision Mamba: Efficient Visual State Space Models",
    authors: ["Lianghui Zhu", "Bencheng Liao", "Qian Zhang", "Xinlong Wang"],
    date: "2026-05-14",
    abstract:
      "We propose Vision Mamba, a novel architecture that adapts the Mamba state space model to vision tasks. Our approach achieves competitive performance with vision transformers while offering linear computational complexity with respect to sequence length, enabling efficient processing of high-resolution inputs.",
    tags: ["vision", "state space models", "Mamba"],
    url: "https://arxiv.org/abs/2405.09033",
  },
  {
    id: "2405.07821",
    title: "Constitutional AI: Harmlessness from AI Feedback",
    authors: ["Yuntao Bai", "Saurav Kadavath", "Sandipan Kundu"],
    date: "2026-05-12",
    abstract:
      "We introduce a method called Constitutional AI for training harmless AI assistants without human feedback labels for harmlessness. The approach uses a set of principles to guide the model's self-critique and revision, achieving strong performance on safety benchmarks while maintaining helpfulness.",
    tags: ["AI safety", "RLHF", "alignment"],
    url: "https://arxiv.org/abs/2405.07821",
  },
  {
    id: "2405.06112",
    title: "LoRA: Low-Rank Adaptation of Large Language Models",
    authors: ["Edward J. Hu", "Yelong Shen", "Phillip Wallis", "Zeyuan Allen-Zhu"],
    date: "2026-05-10",
    abstract:
      "We propose Low-Rank Adaptation (LoRA), which freezes the pre-trained model weights and injects trainable rank decomposition matrices into each layer of the Transformer architecture. This greatly reduces the number of trainable parameters for downstream tasks while maintaining model quality.",
    tags: ["fine-tuning", "LLM", "parameter efficiency"],
    url: "https://arxiv.org/abs/2405.06112",
  },
];

import { GoogleGenAI, Type } from '@google/genai';
import { Act, ScriptElement } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateContentWithRetry(options: any, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContent(options);
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}

export async function generateQuestions(idea: string, duration: number, genre: string) {
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert screenwriter. The user is writing a movie script.
    Genre: "${genre}"
    Idea: "${idea}"
    Duration: ${duration} minutes.
    
    Generate 5 crucial multiple-choice questions to help flesh out the plot, characters, and world-building.
    
    CRITICAL INSTRUCTION: The questions and ALL their options MUST strictly align with the "${genre}" genre and the tone of the idea. 
    For example, if the genre is Horror, the options must be scary, suspenseful, or dark. DO NOT provide comedic, lighthearted, or action-heavy options for a Horror movie unless the idea explicitly calls for it. The options should represent different narrative paths that fit the genre.
    
    CRITICAL: The questions and ALL their options MUST be presented in Vietnamese only.
    Generate exactly 4 options for each question.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['question', 'options'],
        },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

export async function regenerateQuestionOptions(idea: string, duration: number, genre: string, question: string, previousOptions: string[]) {
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert screenwriter. The user is writing a movie script.
    Genre: "${genre}"
    Idea: "${idea}"
    Duration: ${duration} minutes.
    
    The user was asked this question to flesh out the plot: "${question}"
    They rejected these previous options:
    ${previousOptions.map(o => `- ${o}`).join('\n')}
    
    Generate 4 NEW and DISTINCT multiple-choice options for this question that fit the genre and idea.
    DO NOT repeat the previous options.
    
    CRITICAL: The options MUST be presented in Vietnamese only.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

export async function generateRandomIdeas(genre: string, duration: number, extraRequirement: string, dislikedIdeas: { title: string, synopsis: string }[], baseIdea?: string) {
  const dislikedContext = dislikedIdeas.length > 0
    ? `The user previously REJECTED these ideas for this genre:\n${dislikedIdeas.map(i => `- ${i.title}: ${i.synopsis}`).join('\n')}\nAnalyze why they might have disliked them (e.g., too cliché, boring, predictable) and DO NOT generate similar ideas.`
    : '';

  const requirementContext = extraRequirement ? `Specific requirements from user: "${extraRequirement}".` : '';
  
  const baseIdeaContext = baseIdea ? `The user has provided a base idea: "${baseIdea}". Generate 10 variations or expansions of this specific idea. DO NOT repeat the exact base idea. Develop, expand, and create different takes based on it.` : `Generate 10 random movie ideas for the genre: "${genre}".`;

  const durationContext = `The movie duration is ${duration} minutes. Based on this duration and the genre, suggest an appropriate presentation style/format (e.g., "Short film with minimal dialogue / Phim ngắn ít thoại", "Theatrical feature / Phim chiếu rạp", "Storytelling via music and action / Kể chuyện qua âm nhạc và hành động"). This must be bilingual.`;

  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `${baseIdeaContext}
    ${requirementContext}
    ${dislikedContext}
    ${durationContext}
    Make them creative and engaging.
    For each idea, provide:
    - title: The title of the movie.
    - synopsis: A brief summary of the plot.
    - twist: The ending, plot twist, or the truth revealed.
    - details: Specific plot points, moments of reflection, awakening quotes, social issues addressed, or "show don't tell" moments that add depth.
    - lesson: The core life lesson or message for the audience.
    - format: The suggested presentation style/format.
    
    CRITICAL: The entire output (title, synopsis, twist, details, lesson, format) MUST be written entirely in Vietnamese.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Tên phim" },
            synopsis: { type: Type.STRING, description: "Kể về (Nội dung tóm tắt)" },
            twist: { type: Type.STRING, description: "Kết cục/Cú twist/Sự thật là" },
            details: { type: Type.STRING, description: "Tình tiết/Chi tiết đắt giá/Câu nói thức tỉnh" },
            lesson: { type: Type.STRING, description: "Bài học rút ra" },
            format: { type: Type.STRING, description: "Hình thức trình bày (Song ngữ Anh/Việt)" }
          },
          required: ["title", "synopsis", "twist", "details", "lesson", "format"]
        },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

export async function generateDirections(idea: string, duration: number, answers: string[], notes: string[]) {
  const combinedAnswers = answers.map((ans, i) => `Q${i+1}: ${ans}${notes[i] ? ` (Note: ${notes[i]})` : ''}`);
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `Idea: "${idea}". Duration: ${duration} mins. Answers to clarifying questions: ${combinedAnswers.join(' | ')}. 
    Generate 3 distinct plot directions or synopses for this movie.
    
    CRITICAL: The directions MUST be presented in Vietnamese only.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

export async function regenerateDirections(idea: string, duration: number, answers: string[], notes: string[], previousDirections: string[]) {
  const combinedAnswers = answers.map((ans, i) => `Q${i+1}: ${ans}${notes[i] ? ` (Note: ${notes[i]})` : ''}`);
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `Idea: "${idea}". Duration: ${duration} mins. Answers to clarifying questions: ${combinedAnswers.join(' | ')}. 
    
    The user rejected these previous directions:
    ${previousDirections.map(d => `- ${d}`).join('\n')}
    
    Generate 3 NEW and DISTINCT plot directions or synopses for this movie. DO NOT repeat the previous directions.
    
    CRITICAL: The directions MUST be presented in Vietnamese only.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

export interface StyleOption {
  id: string;
  name: string;
  description: string;
  suitabilityScore: number;
  reasoning: string;
}

export async function generateStoryStyles(idea: string, duration: number, answers: string[], notes: string[], direction: string) {
  const combinedAnswers = answers.map((ans, i) => `Q${i+1}: ${ans}${notes[i] ? ` (Note: ${notes[i]})` : ''}`);
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `Idea: "${idea}". Duration: ${duration} mins. Answers to clarifying questions: ${combinedAnswers.join(' | ')}.
    Selected direction: "${direction}". 
    
    Analyze the provided story context and suggest the top 5 most suitable options for each of the following categories:
    1. Opening Styles (Cách mở đầu phim)
    2. Ending Styles (Cách kết thúc phim)
    3. Message Delivery Methods (Cách truyền tải thông điệp nhân văn)
    
    For Opening Styles, consider creative approaches like In medias res, Flashbacks, Dreams, Metaphors, Voice-over, etc.
    For Ending Styles, consider approaches like Open ending, Circular ending (Bookends), Twist ending, Ambiguous ending, Tragic but hopeful, etc.
    For Message Delivery Methods, consider creative "show don't tell" approaches like a recurring motif/object, a final realization without words, a voiceover from a letter/tape, a parallel storyline resolution, etc.
    
    For each option in each category, provide:
    - id: A unique string identifier (e.g., "in_medias_res")
    - name: The name of the style in English and Vietnamese separated by " | " (e.g., "In medias res | Vào giữa sự việc")
    - description: A brief description of how this style will be applied to this specific story, in English and Vietnamese separated by " | "
    - suitabilityScore: A number from 1 to 100 indicating how well it fits this specific story.
    - reasoning: A brief reasoning in English and Vietnamese separated by " | " explaining why it fits.
    
    Return the options sorted by suitabilityScore in descending order within each category.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          openingStyles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                suitabilityScore: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
              },
              required: ['id', 'name', 'description', 'suitabilityScore', 'reasoning'],
            },
          },
          endingStyles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                suitabilityScore: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
              },
              required: ['id', 'name', 'description', 'suitabilityScore', 'reasoning'],
            },
          },
          messageStyles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                suitabilityScore: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
              },
              required: ['id', 'name', 'description', 'suitabilityScore', 'reasoning'],
            },
          },
        },
        required: ['openingStyles', 'endingStyles', 'messageStyles'],
      },
    },
  });
  return JSON.parse(response.text || '{"openingStyles": [], "endingStyles": [], "messageStyles": []}');
}

export async function translateText(text: string, lang: 'vi' | 'en'): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const targetLanguage = lang === 'en' ? 'English' : 'Vietnamese';
  
  if (!text.trim()) return text;

  const prompt = `Translate the following dialogue/text into ${targetLanguage}. ONLY output the raw translated text, no markdown formatting, no explanations, no quotes.

Text to translate:
${text}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.2,
    }
  });

  return response.text || text;
}

export async function generateActs(idea: string, duration: number, answers: string[], notes: string[], direction: string, openingStyle: string, endingStyle: string, messageStyle: string) {
  const combinedAnswers = answers.map((ans, i) => `Q${i+1}: ${ans}${notes[i] ? ` (Note: ${notes[i]})` : ''}`);
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `Idea: "${idea}". Duration: ${duration} mins. Answers to clarifying questions: ${combinedAnswers.join(' | ')}.
    Selected direction: "${direction}".
    Selected Opening Style: "${openingStyle}".
    Selected Ending Style: "${endingStyle}".
    Selected Message Delivery Method: "${messageStyle}".
    
    First, provide a detailed character profile for the main characters (Name, Age, Role, Relationships, Personality, Want, Need, Style).
    CRITICAL CHARACTER DESIGN INSTRUCTION: For every character, the design MUST be standing straight, with a serious, expressionless face.
    Then, divide the story into a standard 3-act structure.
    
    CRITICAL STRUCTURE RULES:
    1. Act 1 - Setting (25% of total duration):
       - Must include the Opening Scene matching the selected style: "${openingStyle}".
       - Must include the Inciting Incident (Biến cố).
       - Must establish the Dramatic Question.
    2. Act 2 - Confrontation (50% of total duration):
       - Must include the Midpoint event.
       - The Midpoint must be established based on secrets/truths gradually revealed, not predictable.
       - Include "Raise the Stakes" elements making things increasingly difficult.
       - Push the character to a "Point of No Return".
       - During confrontation, bigger secrets emerge creating unexpected twists.
       - The result of the Midpoint must be a False Victory or False Defeat.
       - After Midpoint, the character changes from reactive to proactive.
    3. Act 3 - Resolution (25% of total duration):
       - Pre-Climax (5-10% of total duration).
       - Climax (5-10% of total duration).
       - Denouement (10% of total duration).
       - Must answer the Dramatic Question.
       - Must include the Ending Scene matching the selected style: "${endingStyle}".
       - Must convey the humanistic message using the selected method: "${messageStyle}".
       
    For each act, provide a title, a summary, and a list of key events with their estimated duration in minutes (total duration of all events must equal ${duration}).
    Make sure the events are logically ordered and engaging.
    
    CRITICAL: The entire output (character profiles, act titles, summaries, event descriptions) MUST be written entirely in Vietnamese.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                age: { type: Type.STRING },
                role: { type: Type.STRING },
                relationships: { type: Type.STRING },
                personality: { type: Type.STRING },
                want: { type: Type.STRING },
                need: { type: Type.STRING },
                style: { type: Type.STRING },
              },
              required: ['name', 'age', 'role', 'relationships', 'personality', 'want', 'need', 'style'],
            },
          },
          acts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                events: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      duration: { type: Type.NUMBER },
                    },
                    required: ['description', 'duration'],
                  },
                },
              },
              required: ['title', 'summary', 'events'],
            },
          },
        },
        required: ['characters', 'acts'],
      },
    },
  });
  return JSON.parse(response.text || '{"characters": [], "acts": []}');
}

export async function regenerateActs(
  idea: string, 
  duration: number, 
  answers: string[], 
  notes: string[], 
  direction: string,
  openingStyle: string,
  endingStyle: string,
  messageStyle: string,
  previousCharacters: any[],
  previousActs: any[]
) {
  const combinedAnswers = answers.map((ans, i) => `Q${i+1}: ${ans}${notes[i] ? ` (Note: ${notes[i]})` : ''}`);
  
  const previousActsStr = previousActs.map(a => `- ${a.title}: ${a.summary}`).join('\n');
  
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `Idea: "${idea}". Duration: ${duration} mins. Answers to clarifying questions: ${combinedAnswers.join(' | ')}.
    Selected direction: "${direction}".
    Selected Opening Style: "${openingStyle}".
    Selected Ending Style: "${endingStyle}".
    Selected Message Delivery Method: "${messageStyle}".
    
    The user rejected this previous act structure:
    ${previousActsStr}
    
    Generate a NEW and DISTINCT character profile and act structure. DO NOT repeat the exact same structure.
    First, provide a detailed character profile for the main characters (Name, Age, Role, Relationships, Personality, Want, Need, Style).
    CRITICAL CHARACTER DESIGN INSTRUCTION: For every character, the design MUST be standing straight, with a serious, expressionless face.
    Then, divide the story into a standard 3-act structure.
    
    CRITICAL STRUCTURE RULES:
    1. Act 1 - Setting (25% of total duration):
       - Must include the Opening Scene matching the selected style: "${openingStyle}".
       - Must include the Inciting Incident (Biến cố).
       - Must establish the Dramatic Question.
    2. Act 2 - Confrontation (50% of total duration):
       - Must include the Midpoint event.
       - The Midpoint must be established based on secrets/truths gradually revealed, not predictable.
       - Include "Raise the Stakes" elements making things increasingly difficult.
       - Push the character to a "Point of No Return".
       - During confrontation, bigger secrets emerge creating unexpected twists.
       - The result of the Midpoint must be a False Victory or False Defeat.
       - After Midpoint, the character changes from reactive to proactive.
    3. Act 3 - Resolution (25% of total duration):
       - Pre-Climax (5-10% of total duration).
       - Climax (5-10% of total duration).
       - Denouement (10% of total duration).
       - Must answer the Dramatic Question.
       - Must include the Ending Scene matching the selected style: "${endingStyle}".
       - Must convey the humanistic message using the selected method: "${messageStyle}".
       
    For each act, provide a title, a summary, and a list of key events with their estimated duration in minutes (total duration of all events must equal ${duration}).
    Make sure the events are logically ordered and engaging.
    
    CRITICAL: The entire output (character profiles, act titles, summaries, event descriptions) MUST be written entirely in Vietnamese.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                age: { type: Type.STRING },
                role: { type: Type.STRING },
                relationships: { type: Type.STRING },
                personality: { type: Type.STRING },
                want: { type: Type.STRING },
                need: { type: Type.STRING },
              },
              required: ['name', 'age', 'role', 'relationships', 'personality', 'want', 'need'],
            },
          },
          acts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                events: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      duration: { type: Type.NUMBER },
                    },
                    required: ['description', 'duration'],
                  },
                },
              },
              required: ['title', 'summary', 'events'],
            },
          },
        },
        required: ['characters', 'acts'],
      },
    },
  });
  return JSON.parse(response.text || '{"characters": [], "acts": []}');
}

export async function generateScript(
  eventDescription: string,
  eventDuration: number,
  fullSummary: string,
  previousScripts: string,
  scriptLanguage: string,
  dialogueLanguage: string,
  userPrompt?: string,
  selectedText?: string,
  globalInstructions?: string[],
  eventInstructions?: string[],
  openingStyle: string = '',
  endingStyle: string = '',
  messageStyle: string = '',
  image?: { data: string, mimeType: string } | null
) {
  let promptText = 'Write the initial script for this event.';
  if (userPrompt) {
    if (selectedText) {
      promptText = `User selected this specific text: "${selectedText}".\nUser's NEW edit request for ONLY the selected text: "${userPrompt}".\nCRITICAL: You must return the FULL script for this event, but ONLY modify the part that corresponds to the selected text based on the user's request. Keep the rest of the script exactly the same.`;
    } else {
      promptText = `CRITICAL: You MUST ALSO follow this NEW edit request for the whole event:\n"${userPrompt}"`;
    }
  }
  
  let languageInstructions = `The script action and scene headings MUST be written in ${scriptLanguage}. `;
  if (scriptLanguage === 'Tiếng Anh') {
    languageInstructions += `CRITICAL: Since the script language is English, the final script (except dialogue) MUST be written bilingually in English and Vietnamese (e.g., "INT. HOUSE - DAY / TRONG NHÀ - NGÀY"). `;
  }
  
  const isVietnameseDialogue = dialogueLanguage.toLowerCase().includes('việt') || dialogueLanguage.toLowerCase().includes('vietnamese');
  
  if (!isVietnameseDialogue) {
    languageInstructions += `CRITICAL: The dialogue MUST strictly be written in ${dialogueLanguage}. However, you MUST also provide a Vietnamese translation for all dialogue. Format the dialogue text EXACTLY as "Original Dialogue | Vietnamese Translation" (e.g., "Hello! | Xin chào!"). Do not put the translation in parentheses.`;
  } else {
    languageInstructions += `CRITICAL: The dialogue MUST strictly be written in ${dialogueLanguage}.`;
  }

  let globalInstructionsText = '';
  if (globalInstructions && globalInstructions.length > 0) {
    globalInstructionsText = `\nGLOBAL INSTRUCTIONS (Apply these to the entire script):\n${globalInstructions.map(i => `- ${i}`).join('\n')}\n`;
  }

  let eventInstructionsText = '';
  if (eventInstructions && eventInstructions.length > 0) {
    eventInstructionsText = `\nCRITICAL: You MUST follow ALL of the following PREVIOUS APPROVED INSTRUCTIONS:\n${eventInstructions.map(i => `- ${i}`).join('\n')}\n`;
  }

  const contents = `
    Context of the whole movie: ${fullSummary}
    ${openingStyle ? `Selected Opening Style: "${openingStyle}"` : ''}
    ${endingStyle ? `Selected Ending Style: "${endingStyle}"` : ''}
    ${messageStyle ? `Selected Message Delivery Method: "${messageStyle}"` : ''}
    Previous events scripts (if any): ${previousScripts}
    
    Task: Write a detailed screenplay for this specific event: "${eventDescription}".
    Duration: ${eventDuration} minutes.
    CRITICAL INSTRUCTION ON LENGTH: In standard screenplay format, 1 page equals roughly 1 minute of screen time. Therefore, you MUST write enough detailed scene descriptions, character actions, and dialogue to fill approximately ${eventDuration} pages. Do not rush the scene; pace it appropriately to match the duration.
    
    CRITICAL SCREENWRITING RULES:
    1. SHOW, DON'T TELL: Do not write prose or storytelling. Describe visual actions, facial expressions, body language, and sounds. Instead of saying "He was sad", describe him "staring blankly, a tear rolling down his cheek".
    2. CREATIVE NARRATION: Incorporate creative narration methods where appropriate (e.g., Voiceover (V.O.) from a narrator not in the film, a character reading a letter, playing an old tape, or other creative storytelling devices).
    3. NON-LINEAR TIMELINES: Freely use flashbacks, flash-forwards, imagination sequences, or dreams to add depth to the story and characters.
    4. CROSS-CUTTING/PARALLEL EDITING: Do not just follow one character linearly. Cut back and forth between different scenes, characters, or timelines to build tension and dynamic pacing, even if a scene isn't fully finished.
    5. HUMANISTIC MESSAGE: Ensure that the script subtly weaves in a humanistic message (thông điệp nhân văn) through actions, choices, or dialogue.
    
    ${languageInstructions}
    ${globalInstructionsText}
    ${eventInstructionsText}
    ${promptText}
    
    Output MUST be a structured JSON array of screenplay elements.
    Valid types are: 'scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'.
  `;

  const parts: any[] = [{ text: contents }];
  if (image) {
    parts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      }
    });
  }

  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: parts,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'] },
            text: { type: Type.STRING },
          },
          required: ['type', 'text'],
        },
      },
    },
  });
  return JSON.parse(response.text || '[]') as ScriptElement[];
}

export async function regenerateActWithNote(
  idea: string, duration: number, answers: string[], notes: string[], direction: string,
  openingStyle: string, endingStyle: string, messageStyle: string,
  characters: any[], allActs: any[], targetActId: string, userNote: string
) {
  const targetAct = allActs.find(a => a.id === targetActId);
  const contextActs = allActs.map(a => `Act: ${a.title}\nSummary: ${a.summary}\nEvents:\n${a.events.map((e: any) => `- ${e.description} (${e.duration}m)`).join('\n')}`).join('\n\n');
  
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert screenwriter.
    Idea: "${idea}". Duration: ${duration} mins.
    Selected direction: "${direction}".
    Selected Opening Style: "${openingStyle}".
    Selected Ending Style: "${endingStyle}".
    Selected Message Delivery Method: "${messageStyle}".
    
    Current Acts Context:
    ${contextActs}
    
    The user wants to rewrite the following Act:
    Title: ${targetAct?.title}
    Summary: ${targetAct?.summary}
    
    User's instruction/note for rewriting this Act: "${userNote}"
    
    Rewrite THIS SPECIFIC ACT based on the user's note while keeping it consistent with the rest of the story.
    Provide a new title, summary, and list of events with their estimated duration. The total duration of this act should remain roughly the same.
    CRITICAL: The entire output MUST be written entirely in Vietnamese.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          events: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                duration: { type: Type.NUMBER },
              },
            },
          },
        },
      },
    },
  });
  return JSON.parse(response.text || '{}');
}

export async function regenerateEventWithNote(
  idea: string, duration: number, answers: string[], notes: string[], direction: string,
  openingStyle: string, endingStyle: string, messageStyle: string,
  characters: any[], allActs: any[], targetActId: string, targetEventId: string, userNote: string
) {
  const targetAct = allActs.find(a => a.id === targetActId);
  const targetEvent = targetAct?.events.find((e: any) => e.id === targetEventId);
  const contextActs = allActs.map(a => `Act: ${a.title}\nSummary: ${a.summary}\nEvents:\n${a.events.map((e: any) => `- ${e.description} (${e.duration}m)`).join('\n')}`).join('\n\n');
  
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert screenwriter.
    Idea: "${idea}". Duration: ${duration} mins.
    Selected direction: "${direction}".
    Selected Opening Style: "${openingStyle}".
    Selected Ending Style: "${endingStyle}".
    Selected Message Delivery Method: "${messageStyle}".
    
    Current Acts Context:
    ${contextActs}
    
    The user wants to rewrite a specific event in the act "${targetAct?.title}":
    Current Event: ${targetEvent?.description} (${targetEvent?.duration}m)
    
    User's instruction/note for rewriting this event: "${userNote}"
    
    Rewrite THIS SPECIFIC EVENT based on the user's note while keeping it consistent with the rest of the story.
    Provide a new description and estimated duration.
    CRITICAL: The description MUST be written entirely in Vietnamese.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          duration: { type: Type.NUMBER },
        },
      },
    },
  });
  return JSON.parse(response.text || '{}');
}

export async function generateGlobalStylePrompt(script: string, selectedStyle: string, characters: any[]) {
  const charactersInfo = characters.map(c => `- Tên: ${c.name}, Tuổi: ${c.age}, Vai trò: ${c.role}, Tính cách: ${c.personality}, Mong muốn: ${c.want}, Nhu cầu: ${c.need}`).join('\n');

  const prompt = `Bạn là một đạo diễn, biên kịch và cũng là chuyên gia prompt.
Dựa trên kịch bản sau, phong cách nghệ thuật được chọn, và danh sách nhân vật, hãy phân tích tâm lý nhân vật, bối cảnh, hoàn cảnh để thiết kế nhân vật sát với kịch bản.
Hãy viết prompt tạo hình cho TỪNG nhân vật.

Kịch bản tóm tắt:
${script}

Danh sách nhân vật:
${charactersInfo}

Phong cách nghệ thuật được chọn: ${selectedStyle}

Yêu cầu bắt buộc:
Với mỗi nhân vật, hãy tạo ra một prompt thiết kế nhân vật (Character design sheet) tuân thủ CHÍNH XÁC định dạng sau. Trả kết quả prompt theo số lượng nhân vật đã chốt.

Định dạng prompt cho mỗi nhân vật:
*Bối cảnh của phân cảnh là A 2x3 grid showing 6 different camera angles of the EXACT SAME CHARACTER. WHITE BACKGROUND ONLY. Character design sheet.
Character details: Subject: [Tên nhân vật], [Độ tuổi, giới tính, nghề nghiệp/vai trò], Clothing: [Mô tả trang phục chi tiết bằng tiếng Anh, phù hợp với kịch bản], Pose/Expression: Standing straight, rigid posture, serious expression, no expression, Lighting: Soft even studio lighting, Atmosphere: Grounded, practical, everyday concept art, Colors: [Bảng màu bằng tiếng Anh phù hợp với nhân vật và phong cách], Camera Angle: 1. front view medium shot, 2. side view, 3. top view, 4. extreme close up of the eyes, 5. backview, 6. full view front view, Environment: Pure white background. Raw Prompt: Character design sheet of [Tên nhân vật], [Độ tuổi, giới tính, nghề nghiệp/vai trò]. He/She is wearing [Mô tả trang phục bằng tiếng Anh]. Standing straight, rigid posture, serious expression, no expression. Multiple views layout including: 1. front view medium shot, 2. side view, 3. top view, 4. extreme close up of the eyes, 5. backview, 6. full view front view. Soft even studio lighting, grounded practical atmosphere, [Bảng màu bằng tiếng Anh] color palette. Pure white background, concept art style, highly detailed, 8k resolution, [Thêm các từ khóa tiếng Anh về phong cách nghệ thuật được chọn: ${selectedStyle}]. 
The image MUST be a grid of 6 panels (2 rows, 3 columns). 
Each panel MUST show one of these 6 specific angles in order: 
1. front view medium shot, 
2. side view, 
3. top view, 
4. extreme close up of the eyes, 
5. backview, 
6. full view front view. 
Showcase the character's design from these 6 perspectives on a pure white background.*

Lưu ý:
- Giữ nguyên các phần tiếng Anh và các dấu * trong định dạng mẫu.
- Điền các thông tin trong ngoặc vuông [] bằng tiếng Anh (trừ tên nhân vật có thể giữ nguyên).
- Trả về kết quả dưới dạng JSON Array, mỗi phần tử là một object có 2 trường: "characterName" (tên nhân vật) và "prompt" (nội dung prompt tạo hình của nhân vật đó).`;

  const response = await generateContentWithRetry({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            characterName: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
        },
      },
    },
  });

  return JSON.parse(response.text || '[]');
}

export async function refineGlobalStylePrompt(currentPrompt: string, userRequest: string) {
  const prompt = `Bạn là một đạo diễn, biên kịch và cũng là chuyên gia prompt.
Người dùng muốn tinh chỉnh một prompt tạo hình nhân vật hiện có.

Prompt hiện tại:
"""
${currentPrompt}
"""

Yêu cầu tinh chỉnh của người dùng:
"${userRequest}"

Hãy chỉnh sửa prompt hiện tại dựa trên yêu cầu của người dùng.
LƯU Ý QUAN TRỌNG:
- CHỈ chỉnh sửa những phần mà người dùng yêu cầu.
- GIỮ NGUYÊN tất cả các phần khác của prompt hiện tại.
- KHÔNG thay đổi cấu trúc, không xóa các phần in đậm/có dấu * hoặc các placeholder nếu người dùng không yêu cầu.
- Chỉ trả về nội dung prompt đã được chỉnh sửa, không có lời chào hay giải thích thêm.`;

  const response = await generateContentWithRetry({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  return response.text;
}

export async function generateNewEvent(
  projectSummary: string,
  actTitle: string,
  actSummary: string,
  previousEventDesc: string | null,
  nextEventDesc: string | null,
  userIdea: string,
  openingStyle: string = '',
  endingStyle: string = '',
  messageStyle: string = ''
) {
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert screenwriter.
    The user wants to add a NEW event to the following act:
    Act Title: ${actTitle}
    Act Summary: ${actSummary}
    
    Context of the whole movie: ${projectSummary}
    ${openingStyle ? `Selected Opening Style: "${openingStyle}"` : ''}
    ${endingStyle ? `Selected Ending Style: "${endingStyle}"` : ''}
    ${messageStyle ? `Selected Message Delivery Method: "${messageStyle}"` : ''}
    
    ${previousEventDesc ? `The event BEFORE this new event is: "${previousEventDesc}"` : 'This new event will be at the BEGINNING of the act.'}
    ${nextEventDesc ? `The event AFTER this new event is: "${nextEventDesc}"` : 'This new event will be at the END of the act.'}
    
    User's idea for this new event: "${userIdea}"
    
    Generate the description and estimated duration (in minutes) for this new event.
    CRITICAL: The description MUST be written entirely in Vietnamese.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          duration: { type: Type.NUMBER },
        },
        required: ['description', 'duration'],
      },
    },
  });
  return JSON.parse(response.text || '{}');
}

export async function editScriptSegment(
  scriptContextBefore: ScriptElement[],
  scriptTarget: ScriptElement[],
  scriptContextAfter: ScriptElement[],
  userPrompt: string,
  image?: { data: string, mimeType: string } | null
): Promise<ScriptElement[]> {
  const parts: any[] = [{
    text: `You are an expert screenwriter perfectly executing a specific rewrite.
    The user wants to REWRITE a specific segment of the script based on their request.
    
    Context Below (Script elements BEFORE the target snippet):
    ${JSON.stringify(scriptContextBefore, null, 2)}
    
    TARGET SNIPPET TO REWRITE:
    ${JSON.stringify(scriptTarget, null, 2)}
    
    Context After (Script elements AFTER the target snippet):
    ${JSON.stringify(scriptContextAfter, null, 2)}
    
    USER'S REWRITE REQUEST: "${userPrompt}"
    
    CRITICAL RULES:
    1. Read the Context Before and After perfectly so your rewritten snippet blends naturally. Logic, pacing, and tone must match!
    2. Write the NEW snippet in Vietnamese exactly like the input format. If original dialogue had translation (e.g., "Original | Translation"), keep formatting the same.
    3. Replacing Elements: Output a valid JSON array of ScriptElements representing the REPLACEMENT for the TARGET SNIPPET.
    4. DO NOT return elements that already exist in Context Before or Context After. 
    5. ONLY return the new elements meant to replace the Target Snippet.
    `
  }];

  if (image) {
    parts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      }
    });
  }

  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: parts,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'] },
            text: { type: Type.STRING },
          },
          required: ['type', 'text'],
        },
      },
    },
  });
  return JSON.parse(response.text || '[]') as ScriptElement[];
}

export interface SunoPrompt {
  title: string;
  tags: string[];
  prompt: string;
}

export async function generateSunoPrompts(contextText: string): Promise<SunoPrompt[]> {
  const response = await generateContentWithRetry({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert music producer and AI prompt engineer for SUNO AI.
    The user wants to generate background music or a song fitting the following screenplay segment:
    
    "${contextText}"
    
    Create exactly 4 distinct music prompt ideas for this scene.
    For each idea, provide:
    1. A short, thematic title in Vietnamese (e.g., "Nhịp Thở Rừng Sâu").
    2. A list of 2-4 appropriate genre/mood tags in Vietnamese (e.g., ["Kịch tính", "Dồn dập", "Điện ảnh"]).
    3. The ACTUAL prompt in ENGLISH optimized for SUNO AI. Suno prompts usually focus on genre, tempo, mood, instrumentation, and vocal style (if any). Example: "Cinematic thriller instrumental, frantic and panicked mood, fast and irregular rhythm structure, building into explosive brass swells, heavy orchestral taiko drumming, dissonant woodwind shrieks, movie score". Make sure to specify if it's "instrumental" or has vocals.

    Output as a JSON array of objects.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            prompt: { type: Type.STRING }
          },
          required: ['title', 'tags', 'prompt']
        }
      }
    }
  });

  return JSON.parse(response.text || '[]') as SunoPrompt[];
}

export interface MultishotShot {
  number: number;
  duration: number;
  englishPrompt: string;
  vietnamesePrompt: string;
}

export type MultishotComplexity = 'simple' | 'medium' | 'complex';
export type PromptType = 'multishot' | 'continuous' | 'off';
export type CinematicPacing = 'slow' | 'medium' | 'fast';

export async function generateVideoPrompts(
  selectedText: string,
  promptType: PromptType,
  complexity: MultishotComplexity,
  pacing: CinematicPacing
): Promise<MultishotShot[]> {
  let complexityInstructions = '';
  if (complexity === 'simple') {
    complexityInstructions = `
    - COMPLEXITY: SIMPLE.
    - Use basic, standard camera angles (Wide Shot, Medium Shot, Close-up).
    - Use simple, static or slow camera movements (static, slow pan, slow tilt).
    - Keep lighting natural and straightforward.
    `;
  } else if (complexity === 'medium') {
    complexityInstructions = `
    - COMPLEXITY: MEDIUM.
    - Use dynamic and cinematic camera angles (Low Angle, High Angle, Over-the-shoulder).
    - Use engaging camera movements (Tracking shot, Dolly in/out).
    - Specify intentional lighting setups (Cinematic lighting).
    `;
  } else if (complexity === 'complex') {
    complexityInstructions = `
    - COMPLEXITY: COMPLEX (MASTERPIECE CINEMATOGRAPHY).
    - Use highly advanced camera techniques (Match cut, Extreme Close-up macro, POV, Drone).
    - Implement dynamic lighting changes mid-shot.
    - Use complex visual metaphors. The prompts must read like a visionary director's shot list.
    `;
  }

  let typeInstructions = '';
  if (promptType === 'multishot') {
    typeInstructions = `
    - PROMPT TYPE: MULTISHOT. Divide the scene into exactly 4 to 6 distinct shots with varying camera setups.
    `;
  } else if (promptType === 'continuous') {
    typeInstructions = `
    - PROMPT TYPE: CONTINUOUS (LONG TAKE). Create exactly 1 single continuous shot prompt that describes the entire sequence without cuts. Describe how the camera moves through the scene to capture everything.
    `;
  } else if (promptType === 'off') {
    typeInstructions = `
    - PROMPT TYPE: OFF PROMPT (Open-Following-Final). Create exactly 3 shots: 1. An Opening shot (Establishing), 2. A Following shot (Tracking the subject/action), 3. A Final shot (Resolution or key reaction).
    `;
  }

  let pacingInstructions = '';
  if (pacing === 'slow') {
    pacingInstructions = `
    - PACING: SLOW. Focus on lingering details, slow camera movements (e.g., slow creep in), and extended durations per shot (e.g., 5-8 seconds each).
    `;
  } else if (pacing === 'medium') {
    pacingInstructions = `
    - PACING: MEDIUM. Standard cinematic pacing. Mix of moderate camera movements and standard shot durations (e.g., 3-5 seconds each).
    `;
  } else if (pacing === 'fast') {
    pacingInstructions = `
    - PACING: FAST. Frantic, high-energy. Rapid camera movements (whip pans, handheld shakes) and very short shot durations (e.g., 1-2 seconds each).
    `;
  }

  const response = await generateContentWithRetry({
    model: 'gemini-3.1-pro-preview',
    contents: `You are an expert AI video generation prompt engineer and a visionary cinematographer.
    The user has selected a portion of a screenplay:
    "${selectedText}"
    
    Your task is to convert this screenplay segment into AI video generation prompts.
    
    CRITICAL RULES:
    1. Focus heavily on visual description. DO NOT mention character names (use "a young man", "the woman", etc.).
    2. Provide the prompt in English, and also provide a Vietnamese translation.
    
    ${typeInstructions}
    ${complexityInstructions}
    ${pacingInstructions}
    
    Output MUST be a JSON array of objects, where each object represents a shot with the following properties:
    - number: The shot number (1, 2, 3...)
    - duration: The estimated duration of the shot in seconds (number, based on pacing instructions)
    - englishPrompt: The highly detailed AI video generation prompt in English.
    - vietnamesePrompt: The Vietnamese translation of the prompt.
    `,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            number: { type: Type.INTEGER },
            duration: { type: Type.NUMBER },
            englishPrompt: { type: Type.STRING },
            vietnamesePrompt: { type: Type.STRING },
          },
          required: ['number', 'duration', 'englishPrompt', 'vietnamesePrompt'],
        },
      },
    },
  });
  return JSON.parse(response.text || '[]');
}

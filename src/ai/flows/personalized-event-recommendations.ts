// src/ai/flows/personalized-event-recommendations.ts
'use server';

/**
 * @fileOverview Generates personalized event recommendations for attendees based on their browsing history and saved preferences.
 *
 * - generatePersonalizedRecommendations - A function that generates personalized event recommendations.
 * - PersonalizedRecommendationsInput - The input type for the generatePersonalizedRecommendations function.
 * - PersonalizedRecommendationsOutput - The return type for the generatePersonalizedRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedRecommendationsInputSchema = z.object({
  userPreferences: z
    .string()
    .describe('A description of the user\u2019s event preferences, including categories, location, and price range.'),
  browsingHistory: z
    .string()
    .describe('A summary of the user\u2019s past event browsing history, including viewed events and saved events.'),
});
export type PersonalizedRecommendationsInput = z.infer<typeof PersonalizedRecommendationsInputSchema>;

const PersonalizedRecommendationsOutputSchema = z.object({
  eventRecommendations: z
    .array(z.string())
    .describe('A list of personalized event recommendations based on the user\u2019s preferences and browsing history.'),
  shouldShowRecommendations: z
    .boolean()
    .describe('Whether to prioritize showing the recommendations to the user, depending on the quality of the preferences and browsing history.'),
});
export type PersonalizedRecommendationsOutput = z.infer<typeof PersonalizedRecommendationsOutputSchema>;

export async function generatePersonalizedRecommendations(
  input: PersonalizedRecommendationsInput
): Promise<PersonalizedRecommendationsOutput> {
  return personalizedRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedRecommendationsPrompt',
  input: {schema: PersonalizedRecommendationsInputSchema},
  output: {schema: PersonalizedRecommendationsOutputSchema},
  prompt: `You are an event recommendation expert. Given a user's event preferences and browsing history, you will provide a list of personalized event recommendations.

User Preferences: {{{userPreferences}}}
Browsing History: {{{browsingHistory}}}

Based on this information, provide a list of event recommendations that the user might be interested in. Also, determine whether the event preferences and browsing history give enough data to warrant prioritizing showing the recommendations to the user on their homepage. Set 'shouldShowRecommendations' to true or false appropriately.
`,
});

const personalizedRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedRecommendationsFlow',
    inputSchema: PersonalizedRecommendationsInputSchema,
    outputSchema: PersonalizedRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

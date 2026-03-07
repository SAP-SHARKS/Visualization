import asyncio
import edge_tts
import os
from pydub import AudioSegment

dialogue = [
    ("Project Manager", "Thanks for joining the meeting today. I wanted to review our recent milestones and discuss how we can improve the way we plan them.", "Female"),
    ("Team Lead", "Sure, I’ve been thinking about that too. The team is delivering features, but some milestones are still slipping toward the end of the sprint.", "Male"),
    ("Project Manager", "Exactly. I think part of the issue is that our milestones include too many stages, like development, integration, and testing all together.", "Female"),
    ("Team Lead", "Yes, when everything is grouped together it becomes difficult to see where delays actually begin.", "Male"),
    ("Project Manager", "Maybe we should break milestones into smaller checkpoints. For example, development completion could be one milestone and integration readiness another.", "Female"),
    ("Team Lead", "That would make progress much easier to track. The team would also feel a clearer sense of accomplishment when each step is completed.", "Male"),
    ("Project Manager", "Another improvement might be better visibility of dependencies. Sometimes one task depends on another team and we only realize that late.", "Female"),
    ("Team Lead", "I agree. During sprint planning we could map out the dependencies before finalizing the milestone timeline.", "Male"),
    ("Project Manager", "Good idea. I was also thinking about introducing a short mid sprint milestone review meeting.", "Female"),
    ("Team Lead", "That could help a lot. If we notice a blocker early, we can shift priorities instead of discovering it during the final days.", "Male"),
    ("Project Manager", "Exactly, it would give us time to respond rather than react.", "Female"),
    ("Team Lead", "We should also define acceptance criteria more clearly. Sometimes development considers a milestone complete but QA still has additional expectations.", "Male"),
    ("Project Manager", "That’s a good point. Including QA earlier in milestone planning would make the definition of done clearer.", "Female"),
    ("Team Lead", "And that would reduce rework near the end of the sprint.", "Male"),
    ("Project Manager", "Let’s try these improvements in the next sprint and see how the team responds.", "Female"),
    ("Team Lead", "Sounds good. I’ll explain the updated milestone approach to the team during the next planning session.", "Male")
]

VOICE_FEMALE = "en-US-AriaNeural"
VOICE_MALE = "en-US-GuyNeural"
OUTPUT_FILE = "conversation.mp3"
TARGET_DURATION_MS = 120_000  # Exactly 2 minutes

async def generate_speech():
    print("Generating speech audio segments...")
    audio_clips = []
    
    for i, (role, text, gender) in enumerate(dialogue):
        voice = VOICE_FEMALE if gender == "Female" else VOICE_MALE
        filename = f"out_temp_{i}.mp3"
        communicate = edge_tts.Communicate(text, voice, rate="-5%")
        await communicate.save(filename)
        
        # Load the segment and save it to the list
        clip = AudioSegment.from_mp3(filename)
        audio_clips.append(clip)
        
    return audio_clips

async def main():
    clips = await generate_speech()
    
    print("Calculating pauses to match exactly 2 minutes...")
    total_speech_duration = sum(len(clip) for clip in clips)
    print(f"Total speech duration: {total_speech_duration / 1000} seconds")
    
    # We want to fill the remaining time with pauses between lines.
    # 16 lines means 15 gaps between them. Plus maybe a 1-second start and 1-second end.
    remaining_time = TARGET_DURATION_MS - total_speech_duration
    
    # Base padding at start and end
    start_padding = 1000
    end_padding = 1500
    
    remaining_for_gaps = remaining_time - (start_padding + end_padding)
    num_gaps = len(clips) - 1
    
    if remaining_for_gaps < 0:
        print("Warning: Speech is already longer than 2 minutes!")
        gap_duration = 500  # Minimum 0.5s gap if it overshoots
        start_padding = 500
        end_padding = 500
    else:
        gap_duration = remaining_for_gaps // num_gaps
        print(f"Gap duration between sentences: {gap_duration} ms")
        
    final_audio = AudioSegment.silent(duration=start_padding)
    
    for i, clip in enumerate(clips):
        final_audio += clip
        if i < num_gaps:
             final_audio += AudioSegment.silent(duration=gap_duration)
             
    final_audio += AudioSegment.silent(duration=end_padding)
    
    # Trim perfectly to TARGET_DURATION_MS if it went slightly over due to rounding
    if len(final_audio) > TARGET_DURATION_MS:
         final_audio = final_audio[:TARGET_DURATION_MS]
         
    # If it's short, pad the end
    if len(final_audio) < TARGET_DURATION_MS:
         final_audio += AudioSegment.silent(duration=(TARGET_DURATION_MS - len(final_audio)))
    
    print("Exporting final MP3...")
    final_audio.export(OUTPUT_FILE, format="mp3", bitrate="128k")
    print(f"Done. Output saved to {OUTPUT_FILE}. Final length: {len(final_audio)/1000}s ({len(final_audio)//60000}m{(len(final_audio)%60000)/1000}s).")
    
    # Cleanup
    for i in range(len(clips)):
        os.remove(f"out_temp_{i}.mp3")

if __name__ == "__main__":
    asyncio.run(main())

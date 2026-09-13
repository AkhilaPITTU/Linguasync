// Presentation-only helper: never mutates the transcript/translation
// records it is given. When `currentUserId` is provided and matches the
// entry's own speaker, the viewer's own label is always shown as "You" --
// every other participant's name is resolved and returned exactly as
// before.
export const resolveSpeakerName = (item = {}, participants = [], currentUserId) => {
    const speakerId = item.speaker_id ?? item.user_id;

    if (
        currentUserId !== undefined &&
        currentUserId !== null &&
        speakerId !== undefined &&
        speakerId !== null &&
        String(speakerId) === String(currentUserId)
    ) {
        return "You";
    }

    const directName =
        item.speaker_name ||
        item.speaker ||
        item.user_name ||
        item.name;

    if (directName) {
        return directName;
    }

    const participant = participants.find(
        (candidate) => String(candidate.id || candidate.user_id) === String(speakerId)
    );

    return participant?.name || participant?.user_name || "Unknown";
};

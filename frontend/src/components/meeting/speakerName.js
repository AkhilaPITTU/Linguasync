export const resolveSpeakerName = (item = {}, participants = []) => {
    const directName =
        item.speaker_name ||
        item.speaker ||
        item.user_name ||
        item.name;

    if (directName) {
        return directName;
    }

    const speakerId = item.speaker_id || item.user_id;
    const participant = participants.find(
        (candidate) => String(candidate.id || candidate.user_id) === String(speakerId)
    );

    return participant?.name || participant?.user_name || "Unknown";
};

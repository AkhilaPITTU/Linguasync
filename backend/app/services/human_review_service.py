class HumanReviewService:
    """
    Determines whether AI output should be
    reviewed by a human before being accepted.
    """

    def evaluate(
        self,
        overall_confidence: float
    ):

        if overall_confidence >= 85:

            return {
                "review_required": False,
                "review_message": "AI output is highly reliable."
            }

        elif overall_confidence >= 70:

            return {
                "review_required": False,
                "review_message": "AI output is reliable."
            }

        elif overall_confidence >= 50:

            return {
                "review_required": True,
                "review_message": "Please review this translation before using it."
            }

        else:

            return {
                "review_required": True,
                "review_message": "Low confidence. Human review is strongly recommended."
            }


human_review_service = HumanReviewService()
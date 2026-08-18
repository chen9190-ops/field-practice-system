import unittest

from app.service.progress_service import calculate_observation_progress


class ObservationProgressTest(unittest.TestCase):
    def test_combines_fixed_and_free_progress(self):
        progress = calculate_observation_progress(
            fixed_completed=2,
            fixed_required=3,
            free_submitted=1,
            free_enabled=True,
            free_required=2,
        )

        self.assertEqual(progress["fixed"]["completed"], 2)
        self.assertEqual(progress["free"]["completed"], 1)
        self.assertEqual(progress["overall"]["completed"], 3)
        self.assertEqual(progress["overall"]["required"], 5)
        self.assertFalse(progress["overall"]["is_complete"])

    def test_caps_extra_free_observations(self):
        progress = calculate_observation_progress(
            fixed_completed=2,
            fixed_required=2,
            free_submitted=5,
            free_enabled=True,
            free_required=2,
        )

        self.assertEqual(progress["free"]["completed"], 2)
        self.assertEqual(progress["free"]["submitted"], 5)
        self.assertEqual(progress["overall"]["completed"], 4)
        self.assertTrue(progress["overall"]["is_complete"])

    def test_disabled_free_observations_do_not_affect_progress(self):
        progress = calculate_observation_progress(
            fixed_completed=1,
            fixed_required=1,
            free_submitted=3,
            free_enabled=False,
            free_required=4,
        )

        self.assertEqual(progress["free"]["required"], 0)
        self.assertEqual(progress["overall"]["completed"], 1)
        self.assertEqual(progress["overall"]["required"], 1)
        self.assertTrue(progress["overall"]["is_complete"])


if __name__ == "__main__":
    unittest.main()

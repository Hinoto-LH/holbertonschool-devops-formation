import unittest

from devops_bot import validate_energy


class TestValidateEnergy(unittest.TestCase):
    def test_normal_value_stays(self):
        self.assertEqual(validate_energy(50), 50)

    def test_below_zero_becomes_zero(self):
        self.assertEqual(validate_energy(-20), 0)

    def test_above_hundred_becomes_hundred(self):
        self.assertEqual(validate_energy(150), 100)


if __name__ == "__main__":
    unittest.main()
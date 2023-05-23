import pulumi_random as random
from kubernetes.meta import PREFIX
from pulumi import ComponentResource, Output


class JoinToken(ComponentResource):
    def __init__(self, control_plane):
        super().__init__(
            f"{PREFIX}:kubernetes:JoinToken",
            control_plane.cluster.name,
            # {},
            # parent=control_plane,
        )

        name = control_plane.cluster.name

        left = random.RandomString(
            f"{name}-left",
            length=6,
            special=False,
            lower=True,
            number=True,
            upper=False,
            # parent=self,
        )

        right = random.RandomString(
            f"{name}-right",
            length=16,
            special=False,
            lower=True,
            number=True,
            upper=False,
            # parent=self,
        )

        self.token = Output.all(left.result, right.result).apply(
            lambda args: f"{args[0]}.{args[1]}"
        )
